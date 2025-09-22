-- =====================================================
-- 🐱 CATBUTLER - SETUP TABELAS DE FAVORITOS DE RECEITAS
-- =====================================================
-- Execute no Supabase Dashboard > SQL Editor
-- Data: 2025-09-22
-- =====================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. TABELA DE RECEITAS (base para favoritos)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.receitas (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- Identificação externa (TheMealDB ID ou IA ID)
    external_id VARCHAR(50) UNIQUE,
    
    -- Dados básicos da receita
    nome VARCHAR(255) NOT NULL,
    categoria VARCHAR(100),
    origem VARCHAR(100),
    instrucoes TEXT,
    imagem_url TEXT,
    video_url TEXT,
    
    -- Ingredientes como array de texto
    ingredientes TEXT[] DEFAULT '{}',
    
    -- Metadados
    tempo_estimado VARCHAR(50),
    dificuldade VARCHAR(20) CHECK (dificuldade IN ('Fácil', 'Médio', 'Difícil')),
    tags TEXT[], -- Array de tags
    
    -- Fonte e qualidade
    fonte VARCHAR(20) NOT NULL CHECK (fonte IN ('mealdb', 'ia', 'local', 'tudogostoso', 'panelinha', 'cybercook')),
    fonte_url TEXT, -- Link original da receita
    relevancia_score INTEGER DEFAULT 50 CHECK (relevancia_score >= 0 AND relevancia_score <= 100),
    
    -- Status e moderação
    ativo BOOLEAN DEFAULT true,
    verificado BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para receitas
CREATE INDEX IF NOT EXISTS idx_receitas_nome ON public.receitas USING GIN (to_tsvector('portuguese', nome));
CREATE INDEX IF NOT EXISTS idx_receitas_categoria ON public.receitas (categoria);
CREATE INDEX IF NOT EXISTS idx_receitas_origem ON public.receitas (origem);
CREATE INDEX IF NOT EXISTS idx_receitas_fonte ON public.receitas (fonte);
CREATE INDEX IF NOT EXISTS idx_receitas_ativo ON public.receitas (ativo);
CREATE INDEX IF NOT EXISTS idx_receitas_created_at ON public.receitas (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_receitas_ingredientes ON public.receitas USING GIN (ingredientes);

-- =====================================================
-- 2. TABELA DE RECEITAS FAVORITAS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.receitas_favoritas (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    receita_id UUID NOT NULL REFERENCES public.receitas(id) ON DELETE CASCADE,
    
    -- Notas pessoais
    notas TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    
    -- Organização
    tags_pessoais TEXT[], -- tags próprias do usuário
    colecao VARCHAR(100) DEFAULT 'Favoritos', -- "Favoritos", "Quero Fazer", "Já Fiz"
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, receita_id)
);

-- Índices para receitas_favoritas
CREATE INDEX IF NOT EXISTS idx_receitas_favoritas_user ON public.receitas_favoritas (user_id);
CREATE INDEX IF NOT EXISTS idx_receitas_favoritas_receita ON public.receitas_favoritas (receita_id);
CREATE INDEX IF NOT EXISTS idx_receitas_favoritas_colecao ON public.receitas_favoritas (user_id, colecao);
CREATE INDEX IF NOT EXISTS idx_receitas_favoritas_created_at ON public.receitas_favoritas (created_at DESC);

-- =====================================================
-- 3. HABILITAR RLS (Row Level Security)
-- =====================================================
ALTER TABLE public.receitas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receitas_favoritas ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 4. POLÍTICAS RLS PARA RECEITAS
-- =====================================================
-- Receitas são públicas para leitura
DROP POLICY IF EXISTS "Receitas são públicas para leitura" ON public.receitas;
CREATE POLICY "Receitas são públicas para leitura"
ON public.receitas FOR SELECT
USING (true);

-- Apenas usuários autenticados podem inserir receitas
DROP POLICY IF EXISTS "Usuários autenticados podem inserir receitas" ON public.receitas;
CREATE POLICY "Usuários autenticados podem inserir receitas"
ON public.receitas FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================================
-- 5. POLÍTICAS RLS PARA FAVORITOS
-- =====================================================
-- Usuários veem apenas seus próprios favoritos
DROP POLICY IF EXISTS "Usuários veem apenas seus favoritos" ON public.receitas_favoritas;
CREATE POLICY "Usuários veem apenas seus favoritos"
ON public.receitas_favoritas FOR SELECT
USING (auth.uid() = user_id);

-- Usuários podem inserir seus próprios favoritos
DROP POLICY IF EXISTS "Usuários podem inserir favoritos" ON public.receitas_favoritas;
CREATE POLICY "Usuários podem inserir favoritos"
ON public.receitas_favoritas FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Usuários podem atualizar seus próprios favoritos
DROP POLICY IF EXISTS "Usuários podem atualizar favoritos" ON public.receitas_favoritas;
CREATE POLICY "Usuários podem atualizar favoritos"
ON public.receitas_favoritas FOR UPDATE
USING (auth.uid() = user_id);

-- Usuários podem deletar seus próprios favoritos
DROP POLICY IF EXISTS "Usuários podem deletar favoritos" ON public.receitas_favoritas;
CREATE POLICY "Usuários podem deletar favoritos"
ON public.receitas_favoritas FOR DELETE
USING (auth.uid() = user_id);

-- =====================================================
-- 6. TRIGGER PARA UPDATED_AT
-- =====================================================
-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at automaticamente
DROP TRIGGER IF EXISTS update_receitas_updated_at ON public.receitas;
CREATE TRIGGER update_receitas_updated_at
    BEFORE UPDATE ON public.receitas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_receitas_favoritas_updated_at ON public.receitas_favoritas;
CREATE TRIGGER update_receitas_favoritas_updated_at
    BEFORE UPDATE ON public.receitas_favoritas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 7. INSERIR RECEITAS DE EXEMPLO (OPCIONAL)
-- =====================================================
-- Receitas brasileiras populares para teste
INSERT INTO public.receitas (nome, categoria, origem, instrucoes, ingredientes, tempo_estimado, dificuldade, fonte, imagem_url, fonte_url, ativo, verificado)
VALUES 
    (
        'Brigadeiro Tradicional',
        'Sobremesas',
        'TudoGostoso',
        'Em uma panela, misture o leite condensado, o chocolate em pó e a manteiga. Cozinhe em fogo médio, mexendo sempre, até desgrudar do fundo da panela. Deixe esfriar, faça bolinhas e passe no granulado.',
        ARRAY['leite condensado', 'chocolate em pó', 'manteiga', 'granulado'],
        '20min',
        'Fácil',
        'tudogostoso',
        'https://img.tudogostoso.com.br/imagens/receitas/000/000/114/brigadeiro.jpg',
        'https://www.tudogostoso.com.br/receita/114-brigadeiro.html',
        true,
        true
    ),
    (
        'Coxinha de Frango',
        'Salgados',
        'TudoGostoso',
        'Prepare o recheio refogando frango desfiado com temperos. Faça a massa com água, margarina e farinha. Modele as coxinhas, empane e frite em óleo quente.',
        ARRAY['frango', 'farinha de trigo', 'margarina', 'cebola', 'alho', 'farinha de rosca', 'ovo'],
        '1h30min',
        'Médio',
        'tudogostoso',
        'https://img.tudogostoso.com.br/imagens/receitas/000/002/999/coxinha.jpg',
        'https://www.tudogostoso.com.br/receita/2999-coxinha-de-frango.html',
        true,
        true
    ),
    (
        'Arroz de Carreteiro',
        'Pratos Principais',
        'Panelinha',
        'Refogue a cebola e alho. Adicione a carne seca já dessalgada e desfiada. Junte o arroz e refogue bem. Adicione água quente aos poucos até cozinhar o arroz.',
        ARRAY['arroz', 'carne seca', 'cebola', 'alho', 'óleo', 'sal'],
        '45min',
        'Médio',
        'panelinha',
        'https://img.panelinha.com.br/receita/arroz-carreteiro.jpg',
        'https://www.panelinha.com.br/receita/arroz-carreteiro',
        true,
        true
    ),
    (
        'Bolo de Cenoura',
        'Sobremesas',
        'TudoGostoso',
        'Bata no liquidificador cenouras, ovos e óleo. Misture com farinha, açúcar e fermento. Asse por 40min. Para a cobertura, derreta chocolate com leite condensado.',
        ARRAY['cenoura', 'ovos', 'óleo', 'farinha de trigo', 'açúcar', 'fermento', 'chocolate em pó', 'leite condensado'],
        '1h',
        'Fácil',
        'tudogostoso',
        'https://img.tudogostoso.com.br/imagens/receitas/000/000/133/bolo-cenoura.jpg',
        'https://www.tudogostoso.com.br/receita/133-bolo-de-cenoura.html',
        true,
        true
    ),
    (
        'Farofa de Linguiça',
        'Acompanhamentos',
        'TudoGostoso',
        'Frite a linguiça em cubos até dourar. Adicione cebola e alho picados. Junte a farinha de mandioca aos poucos, mexendo sempre. Tempere com sal.',
        ARRAY['linguiça', 'farinha de mandioca', 'cebola', 'alho', 'óleo', 'sal'],
        '25min',
        'Fácil',
        'tudogostoso',
        'https://img.tudogostoso.com.br/imagens/receitas/000/000/156/farofa-linguica.jpg',
        'https://www.tudogostoso.com.br/receita/156-farofa-de-linguica.html',
        true,
        true
    )
ON CONFLICT (external_id) DO NOTHING;

-- =====================================================
-- 8. VERIFICAÇÃO FINAL
-- =====================================================
-- Verificar se as tabelas foram criadas
SELECT 
    'receitas' as tabela,
    COUNT(*) as total_registros
FROM public.receitas
UNION ALL
SELECT 
    'receitas_favoritas' as tabela,
    COUNT(*) as total_registros
FROM public.receitas_favoritas;

-- Listar políticas RLS criadas
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('receitas', 'receitas_favoritas')
ORDER BY tablename, policyname;

-- =====================================================
-- ✅ SETUP COMPLETO!
-- =====================================================
-- Após executar este SQL:
-- 1. Tabelas de receitas e favoritos criadas
-- 2. Índices otimizados implementados
-- 3. RLS habilitado e políticas configuradas
-- 4. Triggers para updated_at funcionando
-- 5. Receitas de exemplo inseridas
-- =====================================================
