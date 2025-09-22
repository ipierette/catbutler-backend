-- 🔧 CORRIGIR TABELA RECEITAS - Adicionar coluna ingredientes
-- Execute no Supabase Dashboard > SQL Editor

-- =====================================================
-- 1. VERIFICAR ESTRUTURA ATUAL DA TABELA RECEITAS
-- =====================================================
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'receitas'
ORDER BY ordinal_position;

-- =====================================================
-- 2. ADICIONAR COLUNA INGREDIENTES SE NÃO EXISTIR
-- =====================================================
DO $$ 
BEGIN
    -- Verificar se a coluna ingredientes existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'receitas' 
        AND column_name = 'ingredientes'
    ) THEN
        -- Adicionar a coluna ingredientes
        ALTER TABLE public.receitas 
        ADD COLUMN ingredientes TEXT[] DEFAULT '{}';
        
        RAISE NOTICE 'Coluna ingredientes adicionada com sucesso!';
    ELSE
        RAISE NOTICE 'Coluna ingredientes já existe!';
    END IF;
END $$;

-- =====================================================
-- 3. INSERIR RECEITAS DE TESTE (VERSÃO CORRIGIDA)
-- =====================================================
INSERT INTO public.receitas (
    nome, 
    categoria, 
    origem, 
    instrucoes, 
    ingredientes, 
    tempo_estimado, 
    dificuldade, 
    fonte, 
    imagem_url,
    ativo
) VALUES 
(
    'Frango Grelhado Simples',
    'Carnes',
    'Brasil',
    'Tempere o frango com sal, pimenta e alho. Grelhe por 15 minutos de cada lado até dourar.',
    ARRAY['frango', 'sal', 'pimenta', 'alho'],
    '30min',
    'Fácil',
    'local',
    '/images/frango-grelhado.jpg',
    true
),
(
    'Omelete de Queijo',
    'Ovos',
    'Brasil',
    'Bata os ovos, adicione o queijo e frite na frigideira com manteiga.',
    ARRAY['ovos', 'queijo', 'manteiga'],
    '15min',
    'Fácil',
    'local',
    '/images/omelete-queijo.jpg',
    true
),
(
    'Arroz com Feijão Brasileiro',
    'Pratos Principais',
    'Brasil',
    'Refogue o arroz com alho e cebola, adicione água e cozinhe. Prepare o feijão com temperos tradicionais.',
    ARRAY['arroz', 'feijão', 'cebola', 'alho', 'óleo'],
    '45min',
    'Médio',
    'local',
    '/images/arroz-feijao.jpg',
    true
),
(
    'Macarrão ao Alho e Óleo',
    'Massas',
    'Itália/Brasil',
    'Cozinhe o macarrão al dente. Em uma frigideira, doure o alho no azeite, adicione o macarrão e misture.',
    ARRAY['macarrão', 'alho', 'azeite', 'sal', 'pimenta'],
    '20min',
    'Fácil',
    'local',
    '/images/macarrao-alho-oleo.jpg',
    true
),
(
    'Salada Verde Simples',
    'Saladas',
    'Brasil',
    'Lave bem as folhas, corte os tomates, tempere com azeite, vinagre, sal e pimenta.',
    ARRAY['alface', 'tomate', 'azeite', 'vinagre', 'sal'],
    '10min',
    'Fácil',
    'local',
    '/images/salada-verde.jpg',
    true
)
ON CONFLICT (external_id) DO NOTHING;

-- =====================================================
-- 4. VERIFICAR SE AS RECEITAS FORAM INSERIDAS
-- =====================================================
SELECT 
    id,
    nome,
    categoria,
    ingredientes,
    fonte,
    ativo,
    created_at
FROM public.receitas
WHERE fonte = 'local'
ORDER BY created_at DESC;

-- =====================================================
-- 5. VERIFICAR ESTRUTURA FINAL
-- =====================================================
SELECT 
    COUNT(*) as total_receitas,
    COUNT(CASE WHEN ativo = true THEN 1 END) as receitas_ativas,
    COUNT(CASE WHEN ingredientes IS NOT NULL AND array_length(ingredientes, 1) > 0 THEN 1 END) as receitas_com_ingredientes
FROM public.receitas;

-- =====================================================
-- ✅ RESULTADO ESPERADO:
-- - Coluna ingredientes existe
-- - Pelo menos 5 receitas inseridas
-- - Todas as receitas têm ingredientes
-- =====================================================
