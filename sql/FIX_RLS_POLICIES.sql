-- 🚨 CatButler - CORREÇÃO URGENTE: Políticas RLS
-- Execute este SQL no Supabase Dashboard IMEDIATAMENTE

-- 1. REMOVER todas as políticas que podem estar com problema
DROP POLICY IF EXISTS "Users can view own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can insert own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON public.tasks;

-- 2. RECRIAR políticas corretas com sintaxe mais simples
CREATE POLICY "Enable read access for own tasks" 
ON public.tasks FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Enable insert for own tasks" 
ON public.tasks FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Enable update for own tasks" 
ON public.tasks FOR UPDATE 
USING (user_id = auth.uid()) 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Enable delete for own tasks" 
ON public.tasks FOR DELETE 
USING (user_id = auth.uid());

-- 3. VERIFICAR se RLS está ativo
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 4. TESTAR as políticas
SELECT 'RLS Policies fixed successfully!' as status;
SELECT policyname FROM pg_policies WHERE tablename = 'tasks';

-- 5. VERIFICAR estrutura da tabela
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tasks' AND table_schema = 'public';