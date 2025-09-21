-- ==================================
-- CatButler Database Schema
-- ==================================
-- Este arquivo contém o schema inicial do banco de dados
-- para o CatButler - Sistema de Produtividade Pessoal
--
-- Versão: 1.0.0
-- Data: 2025-09-15
-- ==================================

-- Habilita extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ==================================
-- TABELA: user_profiles
-- ==================================
-- Armazena perfis dos usuários (complemento ao auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    first_name TEXT,
    last_name TEXT,
    avatar TEXT DEFAULT 'axel' CHECK (avatar IN ('axel', 'frajonilda', 'misscat', 'oliver')),
    theme TEXT DEFAULT 'auto' CHECK (theme IN ('light', 'dark', 'auto')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS para user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Política: usuários só podem ver/editar seu próprio perfil
CREATE POLICY "users_can_manage_own_profile" ON user_profiles
    FOR ALL USING (auth.uid() = id);

-- Índices para user_profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at ON user_profiles(created_at);

-- ==================================
-- TABELA: tasks (Tarefas)
-- ==================================
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    priority TEXT DEFAULT 'media' CHECK (priority IN ('baixa', 'media', 'alta')),
    status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluida')),
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS para tasks
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Política: usuários só podem gerenciar suas próprias tarefas
CREATE POLICY "users_can_manage_own_tasks" ON tasks
    FOR ALL USING (auth.uid() = user_id);

-- Índices para tasks
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_user_created_at ON tasks(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_user_due_date ON tasks(user_id, due_date) WHERE due_date IS NOT NULL;

-- ==================================
-- TABELA: events (Eventos/Agenda)
-- ==================================
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ,
    category TEXT,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS para events
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Política: usuários só podem gerenciar seus próprios eventos
CREATE POLICY "users_can_manage_own_events" ON events
    FOR ALL USING (auth.uid() = user_id);

-- Índices para events
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_user_starts_at ON events(user_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_events_user_created_at ON events(user_id, created_at DESC);

-- ==================================
-- TABELA: activities (Feed de Atividades)
-- ==================================
CREATE TABLE IF NOT EXISTS activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    verb TEXT NOT NULL CHECK (verb IN ('created', 'updated', 'deleted', 'completed')),
    object_type TEXT NOT NULL CHECK (object_type IN ('task', 'event', 'profile', 'recipe', 'list')),
    object_id UUID NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS para activities
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Política: usuários só podem ver suas próprias atividades
CREATE POLICY "users_can_view_own_activities" ON activities
    FOR SELECT USING (auth.uid() = actor_id);

-- Política: usuários podem inserir atividades
CREATE POLICY "users_can_insert_activities" ON activities
    FOR INSERT WITH CHECK (auth.uid() = actor_id);

-- Índices para activities
CREATE INDEX IF NOT EXISTS idx_activities_actor_id ON activities(actor_id);
CREATE INDEX IF NOT EXISTS idx_activities_actor_created_at ON activities(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_object_type ON activities(object_type);

-- ==================================
-- TRIGGERS para updated_at
-- ==================================
-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para as tabelas com updated_at
CREATE TRIGGER trigger_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ==================================
-- FUNÇÕES HELPER
-- ==================================

-- Função para criar perfil automaticamente
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  display_name_value TEXT;
  first_name_value TEXT;
  last_name_value TEXT;
  email_name TEXT;
BEGIN
  -- Extrair nome a partir do email
  email_name := SPLIT_PART(NEW.email, '@', 1);
  
  -- Tentar extrair first_name e last_name de raw_user_meta_data
  first_name_value := COALESCE(
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'firstName',
    INITCAP(email_name)
  );
  
  last_name_value := COALESCE(
    NEW.raw_user_meta_data ->> 'last_name', 
    NEW.raw_user_meta_data ->> 'lastName',
    'User'
  );
  
  -- Criar display_name
  display_name_value := first_name_value || ' ' || last_name_value;
  
  -- Criar perfil do usuário
  INSERT INTO user_profiles (
    id, 
    display_name,
    first_name,
    last_name,
    avatar,
    theme
  )
  VALUES (
    NEW.id,
    display_name_value,
    first_name_value,
    last_name_value,
    'axel', -- Avatar padrão
    'auto'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log do erro mas não falha o processo de criação do usuário
    RAISE WARNING 'Erro ao criar perfil do usuário %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar perfil automaticamente quando usuário se registra
CREATE TRIGGER trigger_handle_new_user
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ==================================
-- VIEWS ÚTEIS
-- ==================================

-- View para estatísticas rápidas do usuário
CREATE OR REPLACE VIEW user_stats AS
SELECT 
    u.id as user_id,
    u.email,
    up.display_name,
    (
        SELECT COUNT(*) 
        FROM tasks t 
        WHERE t.user_id = u.id
    ) as total_tasks,
    (
        SELECT COUNT(*) 
        FROM tasks t 
        WHERE t.user_id = u.id 
        AND t.status = 'concluida'
    ) as completed_tasks,
    (
        SELECT COUNT(*) 
        FROM tasks t 
        WHERE t.user_id = u.id 
        AND t.status IN ('pendente', 'em_andamento')
        AND t.due_date IS NOT NULL 
        AND t.due_date < NOW() + INTERVAL '7 days'
    ) as upcoming_tasks,
    (
        SELECT COUNT(*) 
        FROM events e 
        WHERE e.user_id = u.id 
        AND e.starts_at > NOW() 
        AND e.starts_at < NOW() + INTERVAL '7 days'
    ) as upcoming_events
FROM auth.users u
LEFT JOIN user_profiles up ON up.id = u.id;

-- View para feed de atividades recentes
CREATE OR REPLACE VIEW recent_activities AS
SELECT 
    a.id,
    a.actor_id,
    up.display_name as actor_name,
    a.verb,
    a.object_type,
    a.object_id,
    a.metadata,
    a.created_at,
    -- Busca título do objeto baseado no tipo
    CASE 
        WHEN a.object_type = 'task' THEN (
            SELECT t.title FROM tasks t WHERE t.id = a.object_id::uuid
        )
        WHEN a.object_type = 'event' THEN (
            SELECT e.title FROM events e WHERE e.id = a.object_id::uuid
        )
        ELSE a.metadata->>'title'
    END as object_title
FROM activities a
LEFT JOIN user_profiles up ON up.id = a.actor_id
ORDER BY a.created_at DESC;

-- ==================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ==================================

COMMENT ON TABLE user_profiles IS 'Perfis complementares dos usuários, referencia auth.users';
COMMENT ON COLUMN user_profiles.id IS 'ID do usuário (FK para auth.users.id)';
COMMENT ON COLUMN user_profiles.display_name IS 'Nome de exibição do usuário';
COMMENT ON COLUMN user_profiles.first_name IS 'Primeiro nome do usuário';
COMMENT ON COLUMN user_profiles.last_name IS 'Último nome do usuário';
COMMENT ON COLUMN user_profiles.avatar IS 'Avatar selecionado pelo usuário (axel, frajonilda, misscat, oliver)';
COMMENT ON COLUMN user_profiles.theme IS 'Preferência de tema: light, dark ou auto';

COMMENT ON TABLE tasks IS 'Tarefas/To-dos do usuário';
COMMENT ON COLUMN tasks.priority IS 'Prioridade: baixa, media ou alta';
COMMENT ON COLUMN tasks.status IS 'Status: pendente, em_andamento ou concluida';

COMMENT ON TABLE events IS 'Eventos da agenda do usuário';
COMMENT ON COLUMN events.starts_at IS 'Data/hora de início do evento';
COMMENT ON COLUMN events.ends_at IS 'Data/hora de fim do evento (opcional)';

COMMENT ON TABLE activities IS 'Log de atividades do usuário para feed';
COMMENT ON COLUMN activities.verb IS 'Ação realizada: created, updated, deleted, completed';
COMMENT ON COLUMN activities.object_type IS 'Tipo do objeto: task, event, profile, etc.';
COMMENT ON COLUMN activities.metadata IS 'Dados adicionais em formato JSON';

-- ==================================
-- DADOS INICIAIS (OPCIONAL)
-- ==================================

-- Inserir categorias padrão se necessário
-- Isso pode ser feito via API posteriormente