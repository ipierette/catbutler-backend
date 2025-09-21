-- 🚨 SOLUÇÃO DRÁSTICA: Recriar schema auth
-- Execute este script no SQL Editor se os métodos anteriores não funcionaram

-- ATENÇÃO: Isso vai limpar todos os usuários existentes!
-- Apenas execute se você não tem usuários importantes

-- 1. Limpar usuários existentes
TRUNCATE auth.users CASCADE;

-- 2. Recriar user_profiles sem RLS temporariamente
DROP TABLE IF EXISTS public.user_profiles CASCADE;

CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL DEFAULT '',
    theme TEXT DEFAULT 'auto' CHECK (theme IN ('light', 'dark', 'auto')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Criar trigger de update
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4. Reativar RLS depois de testar
-- ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 5. Recriar políticas RLS (execute depois de criar usuário de teste)
-- CREATE POLICY "Users can view own profile" ON public.user_profiles
--     FOR SELECT USING (auth.uid() = id);

-- CREATE POLICY "Users can update own profile" ON public.user_profiles
--     FOR UPDATE USING (auth.uid() = id);

-- CREATE POLICY "Users can insert own profile" ON public.user_profiles
--     FOR INSERT WITH CHECK (auth.uid() = id);

-- 6. Teste: Tentar criar usuário após executar este script