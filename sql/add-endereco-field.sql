-- ARQUIVO DESABILITADO POR QUESTÕES DE SEGURANÇA
-- Migração: Adicionar campo endereco à tabela user_profiles
-- Data: 06/10/2025
-- STATUS: DESABILITADO até que o site seja 100% seguro

-- IMPORTANTE: Este campo foi removido por questões de segurança
-- Não execute este SQL até que seja confirmado que é seguro armazenar endereços

/*
-- Adicionar campo endereco se não existir
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS endereco TEXT;

-- Comentário sobre o campo
COMMENT ON COLUMN user_profiles.endereco IS 'Endereço do usuário (opcional)';

-- Verificar se o campo foi adicionado
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND column_name = 'endereco';
*/