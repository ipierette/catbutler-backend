-- Verificar e corrigir sistema de favoritos
-- Execute no Supabase SQL Editor

-- 1. Verificar se tabela receitas_favoritas existe
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'receitas_favoritas';

-- 2. Se não existir, criar tabela
CREATE TABLE IF NOT EXISTS receitas_favoritas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    receita_id UUID REFERENCES receitas(id) ON DELETE CASCADE,
    notas TEXT,
    rating NUMERIC(2,1) CHECK (rating >= 0 AND rating <= 5),
    tags_pessoais TEXT[],
    colecao TEXT DEFAULT 'Favoritos',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_id, receita_id)
);

-- 3. Verificar se tabela receitas existe
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'receitas';

-- 4. Se não existir, criar tabela receitas
CREATE TABLE IF NOT EXISTS receitas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL,
    categoria TEXT,
    origem TEXT,
    instrucoes TEXT,
    ingredientes TEXT[],
    tempo_estimado TEXT,
    dificuldade TEXT,
    imagem_url TEXT,
    fonte TEXT CHECK (fonte IN ('local', 'ia', 'themealdb', 'tudogostoso', 'panelinha', 'cybercook', 'mealdb')),
    ativo BOOLEAN DEFAULT true,
    verificado BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fonte_url TEXT
);

-- 5. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_receitas_favoritas_user_id ON receitas_favoritas(user_id);
CREATE INDEX IF NOT EXISTS idx_receitas_favoritas_receita_id ON receitas_favoritas(receita_id);
CREATE INDEX IF NOT EXISTS idx_receitas_nome ON receitas USING gin(to_tsvector('portuguese', nome));
CREATE INDEX IF NOT EXISTS idx_receitas_categoria ON receitas(categoria);
CREATE INDEX IF NOT EXISTS idx_receitas_fonte ON receitas(fonte);

-- 6. Verificar RLS policies
SELECT schemaname, tablename, rowsecurity, policies
FROM pg_policies
WHERE tablename IN ('receitas', 'receitas_favoritas');

-- 7. Se não houver policies, criar policies básicas
DROP POLICY IF EXISTS "Usuários podem ver suas próprias receitas favoritas" ON receitas_favoritas;
CREATE POLICY "Usuários podem ver suas próprias receitas favoritas" ON receitas_favoritas
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem inserir suas próprias receitas favoritas" ON receitas_favoritas;
CREATE POLICY "Usuários podem inserir suas próprias receitas favoritas" ON receitas_favoritas
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem atualizar suas próprias receitas favoritas" ON receitas_favoritas;
CREATE POLICY "Usuários podem atualizar suas próprias receitas favoritas" ON receitas_favoritas
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem deletar suas próprias receitas favoritas" ON receitas_favoritas;
CREATE POLICY "Usuários podem deletar suas próprias receitas favoritas" ON receitas_favoritas
    FOR DELETE USING (auth.uid() = user_id);

-- 8. Policies para receitas
DROP POLICY IF EXISTS "Qualquer um pode ver receitas" ON receitas;
CREATE POLICY "Qualquer um pode ver receitas" ON receitas
    FOR SELECT USING (ativo = true);

DROP POLICY IF EXISTS "Usuários podem inserir receitas" ON receitas;
CREATE POLICY "Usuários podem inserir receitas" ON receitas
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 9. Verificar se há dados de exemplo
SELECT COUNT(*) as total_favoritos FROM receitas_favoritas;
SELECT COUNT(*) as total_receitas FROM receitas;

-- 10. Teste de autenticação (opcional)
-- SELECT auth.uid() as current_user_id;

