-- 🔍 DIAGNÓSTICO AVANÇADO SUPABASE
-- Execute este script no SQL Editor para identificar o problema exato

-- 1️⃣ Verificar estado atual das tabelas auth
SELECT 
    schemaname, 
    tablename, 
    hasrls,
    tablename LIKE '%user%' as is_user_table
FROM pg_tables 
WHERE schemaname IN ('auth', 'public') 
ORDER BY schemaname, tablename;

-- 2️⃣ Verificar triggers na tabela auth.users
SELECT 
    trigger_name, 
    event_manipulation, 
    action_statement
FROM information_schema.triggers 
WHERE event_object_schema = 'auth' 
AND event_object_table = 'users';

-- 3️⃣ Verificar se há constraints problemáticas
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public' 
AND tc.table_name = 'user_profiles';

-- 4️⃣ Verificar functions relacionadas a auth
SELECT 
    proname as function_name,
    prosrc as function_body
FROM pg_proc 
WHERE proname LIKE '%user%' 
OR proname LIKE '%auth%'
ORDER BY proname;

-- 5️⃣ Tentar inserir diretamente na tabela auth.users (VAI FALHAR - é só para ver o erro exato)
-- ESTE COMANDO VAI DAR ERRO - É INTENCIONAL!
-- INSERT INTO auth.users (
--     id, 
--     email, 
--     encrypted_password,
--     email_confirmed_at,
--     created_at,
--     updated_at
-- ) VALUES (
--     gen_random_uuid(),
--     'teste-direto@catbutler.com',
--     crypt('123456789', gen_salt('bf')),
--     NOW(),
--     NOW(),
--     NOW()
-- );

-- 6️⃣ Verificar se extensões necessárias estão instaladas
SELECT * FROM pg_extension WHERE extname IN ('uuid-ossp', 'pgcrypto');

-- 7️⃣ SOLUÇÃO DRÁSTICA: Desabilitar TODOS os triggers em auth.users temporariamente
-- CUIDADO: Execute apenas se orientado!
-- ALTER TABLE auth.users DISABLE TRIGGER ALL;

-- 8️⃣ Para reativar depois:
-- ALTER TABLE auth.users ENABLE TRIGGER ALL;