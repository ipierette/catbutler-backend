-- Migração: Adicionar suporte a avatares
-- Data: 15/09/2025

-- Adicionar campos para avatar e display_name aprimorado
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS avatar TEXT DEFAULT 'axel' 
CHECK (avatar IN ('axel', 'frajonilda', 'misscat', 'oliver')),
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Comentários sobre os campos
COMMENT ON COLUMN user_profiles.avatar IS 'Avatar selecionado pelo usuário (axel, frajonilda, misscat, oliver)';
COMMENT ON COLUMN user_profiles.first_name IS 'Primeiro nome do usuário';
COMMENT ON COLUMN user_profiles.last_name IS 'Último nome do usuário';
COMMENT ON COLUMN user_profiles.display_name IS 'Nome personalizado de exibição ou concatenação de first_name + last_name';

-- Atualizar função de trigger para incluir novos campos
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
  INSERT INTO public.user_profiles (
    id, 
    display_name, 
    first_name, 
    last_name,
    avatar,
    theme, 
    created_at, 
    updated_at
  )
  VALUES (
    NEW.id, 
    display_name_value,
    first_name_value,
    last_name_value, 
    'axel', -- Avatar padrão
    'auto', 
    NOW(), 
    NOW()
  );
  
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log do erro mas não falha o processo de criação do usuário
    RAISE WARNING 'Erro ao criar perfil do usuário %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;