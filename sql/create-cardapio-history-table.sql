-- ============================================
-- 📋 TABELA DE HISTÓRICO DE CARDÁPIOS
-- ============================================
-- Esta tabela armazena o histórico de cardápios gerados para evitar repetições
-- e permitir análises de preferências dos usuários

-- Criar tabela de histórico de cardápios
CREATE TABLE IF NOT EXISTS cardapio_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  

  cardapio_completo TEXT NOT NULL,
  pratos_principais TEXT[] NOT NULL, 
  ingredientes_excluidos TEXT[] DEFAULT '{}', 
  

  seed_variedade TEXT, 
  estatisticas JSONB,
  
 
  culinarias_brasileiras TEXT[] DEFAULT '{}',
  culinarias_internacionais TEXT[] DEFAULT '{}',
  tecnicas_culinarias TEXT[] DEFAULT '{}',
  
  
  data_geracao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


CREATE INDEX IF NOT EXISTS idx_cardapio_user_data ON cardapio_historico(user_id, data_geracao DESC);
CREATE INDEX IF NOT EXISTS idx_cardapio_pratos ON cardapio_historico USING GIN(pratos_principais);
CREATE INDEX IF NOT EXISTS idx_cardapio_excluidos ON cardapio_historico USING GIN(ingredientes_excluidos);


ALTER TABLE cardapio_historico ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Usuários podem ver seus próprios cardápios" ON cardapio_historico
  FOR ALL USING (auth.uid() = user_id);


CREATE POLICY "Usuários podem criar seus próprios cardápios" ON cardapio_historico
  FOR INSERT WITH CHECK (auth.uid() = user_id);


CREATE OR REPLACE FUNCTION limpar_historico_cardapio()
RETURNS TRIGGER AS $$
BEGIN
  -- Remove cardápios antigos, mantendo apenas os 20 mais recentes
  DELETE FROM cardapio_historico 
  WHERE user_id = NEW.user_id 
    AND id NOT IN (
      SELECT id FROM cardapio_historico 
      WHERE user_id = NEW.user_id 
      ORDER BY data_geracao DESC 
      LIMIT 20
    );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para executar limpeza automática
CREATE TRIGGER trigger_limpar_historico_cardapio
  AFTER INSERT ON cardapio_historico
  FOR EACH ROW
  EXECUTE FUNCTION limpar_historico_cardapio();

-- Função para buscar pratos recentes (evitar repetições)
CREATE OR REPLACE FUNCTION buscar_pratos_recentes(p_user_id UUID, p_limite INTEGER DEFAULT 10)
RETURNS TEXT[] AS $$
DECLARE
  pratos_recentes TEXT[];
BEGIN
  SELECT ARRAY_AGG(DISTINCT prato)
  INTO pratos_recentes
  FROM (
    SELECT UNNEST(pratos_principais) as prato
    FROM cardapio_historico 
    WHERE user_id = p_user_id 
    ORDER BY data_geracao DESC 
    LIMIT p_limite
  ) subquery;
  
  RETURN COALESCE(pratos_recentes, '{}');
END;
$$ LANGUAGE plpgsql;

-- View para estatísticas de usuário (corrigida)
CREATE OR REPLACE VIEW cardapio_stats AS
WITH user_cardapios AS (
  SELECT 
    user_id,
    COUNT(*) as total_cardapios,
    MAX(data_geracao) as ultimo_cardapio,
    MIN(data_geracao) as primeiro_cardapio
  FROM cardapio_historico 
  GROUP BY user_id
),
culinarias_brasileiras_stats AS (
  SELECT 
    user_id,
    COUNT(DISTINCT culinaria) as variedade_brasileira
  FROM cardapio_historico, UNNEST(culinarias_brasileiras) AS culinaria
  GROUP BY user_id
),
culinarias_internacionais_stats AS (
  SELECT 
    user_id,
    COUNT(DISTINCT culinaria) as variedade_internacional
  FROM cardapio_historico, UNNEST(culinarias_internacionais) AS culinaria
  GROUP BY user_id
),
tecnicas_stats AS (
  SELECT 
    user_id,
    COUNT(DISTINCT tecnica) as variedade_tecnicas
  FROM cardapio_historico, UNNEST(tecnicas_culinarias) AS tecnica
  GROUP BY user_id
),
ingredientes_excluidos_stats AS (
  SELECT 
    user_id,
    ARRAY_AGG(DISTINCT ingrediente) as ingredientes_mais_excluidos
  FROM cardapio_historico, UNNEST(ingredientes_excluidos) AS ingrediente
  WHERE ingrediente IS NOT NULL
  GROUP BY user_id
)
SELECT 
  uc.user_id,
  uc.total_cardapios,
  COALESCE(cb.variedade_brasileira, 0) as variedade_brasileira,
  COALESCE(ci.variedade_internacional, 0) as variedade_internacional,
  COALESCE(ts.variedade_tecnicas, 0) as variedade_tecnicas,
  COALESCE(ie.ingredientes_mais_excluidos, '{}') as ingredientes_mais_excluidos,
  uc.ultimo_cardapio,
  uc.primeiro_cardapio
FROM user_cardapios uc
LEFT JOIN culinarias_brasileiras_stats cb ON uc.user_id = cb.user_id
LEFT JOIN culinarias_internacionais_stats ci ON uc.user_id = ci.user_id
LEFT JOIN tecnicas_stats ts ON uc.user_id = ts.user_id
LEFT JOIN ingredientes_excluidos_stats ie ON uc.user_id = ie.user_id;

-- Comentários para documentação
COMMENT ON TABLE cardapio_historico IS 'Histórico de cardápios gerados pelos usuários para evitar repetições';
COMMENT ON COLUMN cardapio_historico.pratos_principais IS 'Array dos nomes dos pratos principais extraídos do cardápio';
COMMENT ON COLUMN cardapio_historico.seed_variedade IS 'Seed de variedade usado na geração (ex: Mineira, Italiana, Caseira, Grelhado)';
COMMENT ON COLUMN cardapio_historico.estatisticas IS 'Estatísticas completas do cardápio em formato JSON';
