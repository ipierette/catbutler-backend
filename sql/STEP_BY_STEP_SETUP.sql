-- 🐱 CatButler - SCRIPT PASSO A PASSO PARA SUPABASE
-- Execute este SQL LINHA POR LINHA ou SEÇÃO POR SEÇÃO no Supabase Dashboard

-- ============================================================================
-- PASSO 1: CRIAR TABELA DE PERFIS
-- ============================================================================

-- Execute este bloco primeiro:
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

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Políticas para profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================================================
-- PASSO 2: LIMPAR E CRIAR TABELA DE TAREFAS
-- ============================================================================

-- Execute este bloco depois (vai dropar se existir e recriar):
DROP TABLE IF EXISTS public.tasks CASCADE;

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

-- ============================================================================
-- PASSO 3: CRIAR ÍNDICES
-- ============================================================================

-- Execute este bloco após a tabela estar criada:
CREATE INDEX idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_categoria ON public.tasks(categoria);
CREATE INDEX idx_tasks_prioridade ON public.tasks(prioridade);
CREATE INDEX idx_tasks_data_vencimento ON public.tasks(data_vencimento);

-- ============================================================================
-- PASSO 4: HABILITAR RLS E POLÍTICAS
-- ============================================================================

-- Execute este bloco para segurança:
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
DROP POLICY IF EXISTS "Users can view own tasks" ON public.tasks;
CREATE POLICY "Users can view own tasks" ON public.tasks FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own tasks" ON public.tasks;
CREATE POLICY "Users can insert own tasks" ON public.tasks FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own tasks" ON public.tasks;
CREATE POLICY "Users can update own tasks" ON public.tasks FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own tasks" ON public.tasks;
CREATE POLICY "Users can delete own tasks" ON public.tasks FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- PASSO 5: CRIAR FUNÇÕES E TRIGGERS
-- ============================================================================

-- Execute este bloco para automações:
CREATE OR REPLACE FUNCTION handle_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  
  IF NEW.status = 'Concluída' AND OLD.status != 'Concluída' THEN
    NEW.data_conclusao = NOW();
  ELSIF NEW.status != 'Concluída' AND OLD.status = 'Concluída' THEN
    NEW.data_conclusao = NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tasks_updated_at ON public.tasks;
CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION handle_tasks_updated_at();

-- ============================================================================
-- PASSO 6: FUNÇÃO DE ESTATÍSTICAS
-- ============================================================================

-- Execute este bloco para estatísticas:
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
-- PASSO 7: LIMPEZA AUTOMÁTICA (OPCIONAL)
-- ============================================================================

-- Execute este bloco para limpeza automática:
CREATE OR REPLACE FUNCTION cleanup_completed_tasks()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.tasks 
  WHERE status = 'Concluída' 
    AND data_conclusao < NOW() - INTERVAL '24 hours';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'CatButler: % tarefas antigas removidas', deleted_count;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- VERIFICAÇÃO FINAL
-- ============================================================================

-- Execute este bloco para verificar se tudo funcionou:
SELECT 'Tabelas criadas com sucesso!' as status;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('profiles', 'tasks');

-- Teste a função de estatísticas (vai retornar zeros se não houver tarefas):
-- SELECT * FROM get_tasks_stats(auth.uid());

-- ✅ SUCESSO! Agora teste no seu app!