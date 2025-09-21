-- 🔧 SCRIPT DE REPARO SUPABASE AUTH
-- Execute este script no SQL Editor do Supabase se ainda houver problemas

-- 1. Verificar se tabelas auth existem
SELECT schemaname, tablename 
FROM pg_tables 
WHERE schemaname = 'auth' 
ORDER BY tablename;

-- 2. Verificar usuários existentes
SELECT email, email_confirmed_at, created_at 
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;

-- 3. Limpar usuários de teste problemáticos (se necessário)
-- DELETE FROM auth.users WHERE email LIKE '%@catbutler.com';

-- 4. Verificar configurações de signup
SELECT key, value 
FROM auth.config 
WHERE key IN ('signup_enabled', 'email_confirmation_required');

-- 5. Se a tabela user_profiles tem constraints que podem estar causando problema
-- Verificar se há triggers ou constraints que impedem inserção
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_schema = 'public' 
AND table_name = 'user_profiles';

-- 6. SOLUÇÃO ALTERNATIVA: Desabilitar RLS temporariamente em user_profiles
-- (Execute apenas se o problema persistir)
-- ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;

-- 7. Reativar RLS depois de criar usuário
-- ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;