-- =====================================================
-- TABELAS PARA FUNCIONALIDADES DA COZINHA IA
-- =====================================================
-- Criado em: 2025-09-20
-- Descrição: Estrutura de banco para armazenar receitas,
--            ingredientes, interações com IA e favoritos
-- =====================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. TABELA DE RECEITAS
-- =====================================================
-- Armazena receitas do TheMealDB e sugestões da IA
CREATE TABLE public.receitas (
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
    
    -- Metadados
    tempo_estimado VARCHAR(50),
    dificuldade VARCHAR(20) CHECK (dificuldade IN ('Fácil', 'Médio', 'Difícil')),
    tags TEXT[], -- Array de tags
    
    -- Fonte e qualidade
    fonte VARCHAR(20) NOT NULL CHECK (fonte IN ('mealdb', 'ia')),
    relevancia_score INTEGER DEFAULT 50 CHECK (relevancia_score >= 0 AND relevancia_score <= 100),
    
    -- Status e moderação
    ativo BOOLEAN DEFAULT true,
    verificado BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para receitas
CREATE INDEX idx_receitas_nome ON public.receitas USING GIN (to_tsvector('portuguese', nome));
CREATE INDEX idx_receitas_categoria ON public.receitas (categoria);
CREATE INDEX idx_receitas_origem ON public.receitas (origem);
CREATE INDEX idx_receitas_fonte ON public.receitas (fonte);
CREATE INDEX idx_receitas_ativo ON public.receitas (ativo);
CREATE INDEX idx_receitas_created_at ON public.receitas (created_at DESC);

-- =====================================================
-- 2. TABELA DE INGREDIENTES
-- =====================================================
-- Armazena ingredientes únicos e suas propriedades
CREATE TABLE public.ingredientes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- Dados do ingrediente
    nome VARCHAR(200) NOT NULL UNIQUE,
    nome_normalizado VARCHAR(200) NOT NULL, -- para busca
    categoria VARCHAR(100), -- proteína, vegetal, carboidrato, etc.
    icone VARCHAR(10), -- emoji
    
    -- Metadados nutricionais (opcionais)
    calorias_100g INTEGER,
    proteinas_100g DECIMAL(5,2),
    carboidratos_100g DECIMAL(5,2),
    gorduras_100g DECIMAL(5,2),
    
    -- Informações de uso
    popular BOOLEAN DEFAULT false,
    sazonal VARCHAR(100), -- meses do ano
    
    -- Status
    ativo BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para ingredientes
CREATE INDEX idx_ingredientes_nome_normalizado ON public.ingredientes (nome_normalizado);
CREATE INDEX idx_ingredientes_categoria ON public.ingredientes (categoria);
CREATE INDEX idx_ingredientes_popular ON public.ingredientes (popular) WHERE popular = true;

-- =====================================================
-- 3. TABELA DE RELACIONAMENTO RECEITA-INGREDIENTE
-- =====================================================
-- Liga receitas aos ingredientes com quantidades
CREATE TABLE public.receita_ingredientes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    receita_id UUID NOT NULL REFERENCES public.receitas(id) ON DELETE CASCADE,
    ingrediente_id UUID NOT NULL REFERENCES public.ingredientes(id) ON DELETE CASCADE,
    
    -- Quantidade e medida
    quantidade VARCHAR(100), -- "2 xícaras", "500g", "a gosto"
    ingrediente_original VARCHAR(200), -- texto original do TheMealDB
    
    -- Ordem na lista de ingredientes
    ordem INTEGER DEFAULT 0,
    
    -- Obrigatório ou opcional
    obrigatorio BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(receita_id, ingrediente_id)
);

-- Índices para receita_ingredientes
CREATE INDEX idx_receita_ingredientes_receita ON public.receita_ingredientes (receita_id);
CREATE INDEX idx_receita_ingredientes_ingrediente ON public.receita_ingredientes (ingrediente_id);
CREATE INDEX idx_receita_ingredientes_ordem ON public.receita_ingredientes (receita_id, ordem);

-- =====================================================
-- 4. TABELA DE INTERAÇÕES COM IA (CHAT)
-- =====================================================
-- Armazena conversas dos usuários com o Chef IA
CREATE TABLE public.chat_interactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- Usuário (se logado)
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Sessão (para visitantes)
    session_id VARCHAR(100),
    
    -- Dados da conversa
    mensagem_usuario TEXT NOT NULL,
    resposta_ia TEXT NOT NULL,
    
    -- Contexto
    ingredientes_contexto TEXT[], -- ingredientes mencionados
    receitas_sugeridas UUID[], -- IDs de receitas sugeridas
    
    -- Metadados
    modelo_ia VARCHAR(100), -- modelo usado
    tempo_resposta_ms INTEGER,
    
    -- Avaliação do usuário
    avaliacao INTEGER CHECK (avaliacao >= 1 AND avaliacao <= 5),
    feedback_texto TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para chat_interactions
CREATE INDEX idx_chat_user_id ON public.chat_interactions (user_id);
CREATE INDEX idx_chat_session_id ON public.chat_interactions (session_id);
CREATE INDEX idx_chat_created_at ON public.chat_interactions (created_at DESC);
CREATE INDEX idx_chat_ingredientes ON public.chat_interactions USING GIN (ingredientes_contexto);

-- =====================================================
-- 5. TABELA DE RECEITAS FAVORITAS
-- =====================================================
-- Receitas salvas pelos usuários
CREATE TABLE public.receitas_favoritas (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    receita_id UUID NOT NULL REFERENCES public.receitas(id) ON DELETE CASCADE,
    
    -- Notas pessoais
    notas TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    
    -- Organização
    tags_pessoais TEXT[], -- tags próprias do usuário
    coleção VARCHAR(100), -- "Favoritos", "Quero Fazer", "Já Fiz"
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, receita_id));

-- Índices para receitas_favoritas
CREATE INDEX idx_receitas_favoritas_user ON public.receitas_favoritas (user_id);
CREATE INDEX idx_receitas_favoritas_receita ON public.receitas_favoritas (receita_id);
CREATE INDEX idx_receitas_favoritas_coleção ON public.receitas_favoritas (user_id, coleção);

-- =====================================================
-- 6. TABELA DE ANALYTICS E MÉTRICAS
-- =====================================================
-- Para acompanhar uso e melhorar sugestões
CREATE TABLE public.cozinha_analytics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- Usuário (se logado)
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Tipo de evento
    evento VARCHAR(50) NOT NULL, -- 'busca', 'sugestao_ia', 'receita_view', 'ingrediente_add'
    
    -- Dados do evento
    dados JSONB, -- dados específicos do evento
    
    -- Contexto
    user_agent TEXT,
    ip_address INET,
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW());
    
-- Índices para analytics
CREATE INDEX idx_analytics_evento ON public.cozinha_analytics (evento);
CREATE INDEX idx_analytics_user_id ON public.cozinha_analytics (user_id);
CREATE INDEX idx_analytics_created_at ON public.cozinha_analytics (created_at DESC);
CREATE INDEX idx_analytics_dados ON public.cozinha_analytics USING GIN (dados);

-- =====================================================
-- TRIGGERS PARA UPDATED_AT
-- =====================================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers
CREATE TRIGGER update_receitas_updated_at BEFORE UPDATE ON public.receitas FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_ingredientes_updated_at BEFORE UPDATE ON public.ingredientes FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_receitas_favoritas_updated_at BEFORE UPDATE ON public.receitas_favoritas FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- =====================================================
-- RLS (ROW LEVEL SECURITY)
-- =====================================================

-- Habilitar RLS nas tabelas de usuário
ALTER TABLE public.receitas_favoritas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_interactions ENABLE ROW LEVEL SECURITY;

-- Políticas para receitas_favoritas
CREATE POLICY "Usuários podem ver suas próprias receitas favoritas" 
ON public.receitas_favoritas FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir suas próprias receitas favoritas" 
ON public.receitas_favoritas FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias receitas favoritas" 
ON public.receitas_favoritas FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar suas próprias receitas favoritas" 
ON public.receitas_favoritas FOR DELETE 
USING (auth.uid() = user_id);

-- Políticas para chat_interactions
CREATE POLICY "Usuários podem ver suas próprias interações de chat" 
ON public.chat_interactions FOR SELECT 
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Usuários podem inserir suas próprias interações de chat" 
ON public.chat_interactions FOR INSERT 
WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

-- =====================================================
-- VIEWS ÚTEIS
-- =====================================================

-- View com receitas e contagem de ingredientes
CREATE VIEW public.receitas_completas AS
SELECT 
    r.*,
    COUNT(ri.ingrediente_id) as total_ingredientes,
    COUNT(rf.id) as total_favoritos
FROM public.receitas r
LEFT JOIN public.receita_ingredientes ri ON r.id = ri.receita_id
LEFT JOIN public.receitas_favoritas rf ON r.id = rf.receita_id
WHERE r.ativo = true
GROUP BY r.id
ORDER BY r.created_at DESC;

-- View com ingredientes mais populares
CREATE VIEW public.ingredientes_populares AS
SELECT 
    i.*,
    COUNT(ri.receita_id) as total_receitas
FROM public.ingredientes i
LEFT JOIN public.receita_ingredientes ri ON i.id = ri.ingrediente_id
WHERE i.ativo = true
GROUP BY i.id
ORDER BY i.popular DESC, total_receitas DESC
LIMIT 50;

-- =====================================================
-- DADOS INICIAIS
-- =====================================================

-- Inserir ingredientes populares básicos
INSERT INTO public.ingredientes (nome, nome_normalizado, categoria, icone, popular) VALUES
('Frango', 'frango', 'proteina', '🍗', true),
('Arroz', 'arroz', 'carboidrato', '🍚', true),
('Feijão', 'feijao', 'proteina', '🫘', true),
('Tomate', 'tomate', 'vegetal', '🍅', true),
('Cebola', 'cebola', 'vegetal', '🧅', true),
('Alho', 'alho', 'tempero', '🧄', true),
('Ovos', 'ovos', 'proteina', '🥚', true),
('Queijo', 'queijo', 'laticinios', '🧀', true),
('Batata', 'batata', 'carboidrato', '🥔', true),
('Cenoura', 'cenoura', 'vegetal', '🥕', true),
('Leite', 'leite', 'laticinios', '🥛', true),
('Óleo', 'oleo', 'gordura', '🛢️', true),
('Sal', 'sal', 'tempero', '🧂', true),
('Açúcar', 'acucar', 'adoçante', '🍯', true),
('Farinha de Trigo', 'farinha trigo', 'carboidrato', '🌾', true)
ON CONFLICT (nome) DO NOTHING;

-- =====================================================
-- COMENTÁRIOS FINAIS
-- =====================================================

COMMENT ON TABLE public.receitas IS 'Armazena receitas do TheMealDB e sugestões da IA';
COMMENT ON TABLE public.ingredientes IS 'Catálogo de ingredientes únicos com metadados';
COMMENT ON TABLE public.receita_ingredientes IS 'Relacionamento entre receitas e ingredientes';
COMMENT ON TABLE public.chat_interactions IS 'Histórico de conversas com o Chef IA';
COMMENT ON TABLE public.receitas_favoritas IS 'Receitas salvas pelos usuários';
COMMENT ON TABLE public.cozinha_analytics IS 'Métricas de uso da funcionalidade cozinha';