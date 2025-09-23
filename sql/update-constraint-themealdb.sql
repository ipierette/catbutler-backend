-- Atualizar constraint para permitir 'themealdb' como fonte válida
-- Execute no Supabase SQL Editor

ALTER TABLE receitas
DROP CONSTRAINT IF EXISTS receitas_fonte_check;

ALTER TABLE receitas
ADD CONSTRAINT receitas_fonte_check
CHECK (fonte IN ('local', 'ia', 'themealdb', 'tudogostoso', 'panelinha', 'cybercook', 'mealdb'));

-- Verificar se a constraint foi atualizada
SELECT conname, consrc
FROM pg_constraint
WHERE conrelid = (SELECT oid FROM pg_class WHERE relname = 'receitas')
AND conname LIKE '%fonte%';

