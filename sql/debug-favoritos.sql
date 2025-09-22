-- 🔍 DEBUG - Verificar estado das tabelas de favoritos
-- Execute no Supabase Dashboard > SQL Editor

-- =====================================================
-- 1. VERIFICAR SE AS TABELAS EXISTEM
-- =====================================================
SELECT 
    schemaname,
    tablename,
    hasindexes,
    hasrules,
    hastriggers
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('receitas', 'receitas_favoritas')
ORDER BY tablename;

-- =====================================================
-- 2. VERIFICAR DADOS NA TABELA RECEITAS
-- =====================================================
SELECT 
    COUNT(*) as total_receitas,
    COUNT(CASE WHEN ativo = true THEN 1 END) as receitas_ativas,
    array_agg(DISTINCT fonte) as fontes_disponiveis
FROM public.receitas;

-- =====================================================
-- 3. VERIFICAR DADOS NA TABELA RECEITAS_FAVORITAS
-- =====================================================
SELECT 
    COUNT(*) as total_favoritos,
    COUNT(DISTINCT user_id) as usuarios_com_favoritos
FROM public.receitas_favoritas;

-- =====================================================
-- 4. VERIFICAR RLS POLÍTICAS
-- =====================================================
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('receitas', 'receitas_favoritas')
ORDER BY tablename, policyname;

-- =====================================================
-- 5. INSERIR RECEITAS DE TESTE (SE NÃO EXISTIREM)
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
    'Arroz com Feijão',
    'Pratos Principais',
    'Brasil',
    'Refogue o arroz, adicione água e cozinhe. Prepare o feijão com temperos.',
    ARRAY['arroz', 'feijão', 'cebola', 'alho'],
    '45min',
    'Médio',
    'local',
    '/images/arroz-feijao.jpg',
    true
)
ON CONFLICT (external_id) DO NOTHING;

-- =====================================================
-- 6. VERIFICAR SE AS RECEITAS FORAM INSERIDAS
-- =====================================================
SELECT 
    id,
    nome,
    categoria,
    fonte,
    ativo,
    created_at
FROM public.receitas
ORDER BY created_at DESC
LIMIT 10;

-- =====================================================
-- 7. TESTAR CONSULTA DE FAVORITOS (COMO O BACKEND FAZ)
-- =====================================================
-- Substitua 'SEU_USER_ID_AQUI' pelo ID real de um usuário
/*
SELECT 
    rf.*,
    r.id as receita_id,
    r.nome as receita_nome,
    r.categoria,
    r.origem,
    r.imagem_url,
    r.tempo_estimado,
    r.dificuldade,
    r.fonte
FROM public.receitas_favoritas rf
LEFT JOIN public.receitas r ON rf.receita_id = r.id
WHERE rf.user_id = 'SEU_USER_ID_AQUI'
ORDER BY rf.created_at DESC;
*/

-- =====================================================
-- 8. VERIFICAR PERMISSÕES RLS
-- =====================================================
-- Testar se um usuário consegue ver receitas (devem ser públicas)
SELECT COUNT(*) as receitas_visiveis FROM public.receitas WHERE ativo = true;

-- =====================================================
-- ✅ RESULTADO ESPERADO
-- =====================================================
-- 1. Tabelas existem ✅
-- 2. Receitas têm pelo menos 3 registros ✅  
-- 3. Políticas RLS estão ativas ✅
-- 4. Receitas são visíveis publicamente ✅
-- =====================================================
