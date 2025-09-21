-- 🐱 CatButler - SCRIPT COMPLETO PARA SUPABASE
-- Execute este SQL completo no Supabase Dashboard > SQL Editor

-- ============================================================================
-- 1. CRIAR TABELA DE PERFIS (se não existir)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  name TEXT,
  avatar_url TEXT,
  bio TEXT,
  theme TEXT DEFAULT 'light',
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS na tabela profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Política para profiles (usuários veem apenas seu próprio perfil)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- ============================================================================
-- 2. CRIAR TABELA DE TAREFAS
-- ============================================================================

-- Primeiro, dropar a tabela se existir para recriar corretamente
DROP TABLE IF EXISTS public.tasks CASCADE;

-- Criar tabela tasks corretamente
CREATE TABLE public.tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  categoria TEXT NOT NULL DEFAULT 'Outros',
  prioridade TEXT NOT NULL DEFAULT 'Média' CHECK (prioridade IN ('Baixa', 'Média', 'Alta')),
  status TEXT NOT NULL DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Em Andamento', 'Concluída')),
  data_criacao TIMESTAMPTZ DEFAULT NOW(),
  data_vencimento DATE,
  data_conclusao TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índices para performance APÓS a tabela estar criada
CREATE INDEX idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_categoria ON public.tasks(categoria);
CREATE INDEX idx_tasks_prioridade ON public.tasks(prioridade);
CREATE INDEX idx_tasks_data_vencimento ON public.tasks(data_vencimento);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Criar políticas de acesso - Usuários podem ver apenas suas próprias tarefas
DROP POLICY IF EXISTS "Users can view own tasks" ON public.tasks;
CREATE POLICY "Users can view own tasks" 
ON public.tasks FOR SELECT 
USING (auth.uid() = user_id);

-- Usuários podem inserir apenas suas próprias tarefas
DROP POLICY IF EXISTS "Users can insert own tasks" ON public.tasks;
CREATE POLICY "Users can insert own tasks" 
ON public.tasks FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Usuários podem atualizar apenas suas próprias tarefas
DROP POLICY IF EXISTS "Users can update own tasks" ON public.tasks;
CREATE POLICY "Users can update own tasks" 
ON public.tasks FOR UPDATE 
USING (auth.uid() = user_id);

-- Usuários podem deletar apenas suas próprias tarefas
DROP POLICY IF EXISTS "Users can delete own tasks" ON public.tasks;
CREATE POLICY "Users can delete own tasks" 
ON public.tasks FOR DELETE 
USING (auth.uid() = user_id);

-- ============================================================================
-- 3. CRIAR FUNÇÃO PARA ATUALIZAR TIMESTAMPS AUTOMATICAMENTE
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  
  -- Se o status mudou para "Concluída", definir data_conclusao
  IF NEW.status = 'Concluída' AND OLD.status != 'Concluída' THEN
    NEW.data_conclusao = NOW();
  ELSIF NEW.status != 'Concluída' AND OLD.status = 'Concluída' THEN
    NEW.data_conclusao = NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para updated_at e data_conclusao
DROP TRIGGER IF EXISTS tasks_updated_at ON public.tasks;
CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION handle_tasks_updated_at();

-- ============================================================================
-- 4. CRIAR FUNÇÃO DE ESTATÍSTICAS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_tasks_stats(user_uuid UUID)
RETURNS TABLE (
  total_tasks BIGINT,
  pending_tasks BIGINT,
  in_progress_tasks BIGINT,
  completed_tasks BIGINT,
  overdue_tasks BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_tasks,
    COUNT(*) FILTER (WHERE status = 'Pendente') as pending_tasks,
    COUNT(*) FILTER (WHERE status = 'Em Andamento') as in_progress_tasks,
    COUNT(*) FILTER (WHERE status = 'Concluída') as completed_tasks,
    COUNT(*) FILTER (WHERE status != 'Concluída' AND data_vencimento < CURRENT_DATE) as overdue_tasks
  FROM public.tasks 
  WHERE user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. CRIAR FUNÇÃO DE LIMPEZA AUTOMÁTICA
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_completed_tasks()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Deletar tarefas concluídas há mais de 24 horas
  DELETE FROM public.tasks 
  WHERE status = 'Concluída' 
    AND data_conclusao < NOW() - INTERVAL '24 hours';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log da limpeza
  RAISE NOTICE 'CatButler: % tarefas antigas removidas em %', deleted_count, NOW();
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. LIMPEZA AUTOMÁTICA (OPCIONAL - APENAS SE NECESSÁRIO)
-- ============================================================================

-- A função cleanup_completed_tasks() já foi criada acima
-- Você pode executar manualmente quando quiser:
-- SELECT cleanup_completed_tasks();

-- ⚠️ CRON JOB É OPCIONAL - Descomente apenas se quiser automação:
-- 
-- Para habilitar limpeza automática diária (OPCIONAL):
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('catbutler-cleanup', '0 2 * * *', 'SELECT cleanup_completed_tasks();');
--
-- Para remover o cron job:
-- SELECT cron.unschedule('catbutler-cleanup');

-- ============================================================================
-- 7. VERIFICAÇÕES FINAIS
-- ============================================================================

-- Verificar se as tabelas foram criadas
SELECT 'Tabelas criadas:' as status;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'tasks');

-- Verificar se as políticas RLS estão ativas
SELECT 'Políticas RLS ativas:' as status;
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'tasks');

-- Testar função de estatísticas (deve funcionar mesmo sem tarefas)
SELECT 'Testando função de estatísticas:' as status;
-- SELECT * FROM get_tasks_stats(auth.uid());  -- Descomente para testar

-- ✅ CONFIGURAÇÃO CONCLUÍDA!
SELECT '🐱 CatButler database setup completed successfully!' as final_status;

-- ============================================================================
-- COMANDOS ÚTEIS PARA MANUTENÇÃO:
-- ============================================================================

-- Executar limpeza manual:
-- SELECT cleanup_completed_tasks();

-- Ver estatísticas de um usuário:
-- SELECT * FROM get_tasks_stats('SEU_USER_ID_AQUI');

-- Remover cron job (se necessário):
-- SELECT cron.unschedule('catbutler-cleanup-completed-tasks');

-- Ver logs do cron:
-- SELECT * FROM cron.job_run_details 
-- WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname = 'catbutler-cleanup-completed-tasks') 
-- ORDER BY start_time DESC;