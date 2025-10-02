-- ============================================
-- 📅 SISTEMA DE CARDÁPIO SEMANAL - 1 POR SEMANA
-- ============================================
-- Sistema que permite apenas 1 cardápio por usuário por semana
-- com versionamento para edições manuais

-- Criar tabela de cardápios semanais
CREATE TABLE IF NOT EXISTS cardapio_semanal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Controle semanal (chave única)
  ano INTEGER NOT NULL,
  semana INTEGER NOT NULL, -- Semana do ano (1-52)
  
  -- Dados do cardápio
  cardapio_original TEXT NOT NULL, -- Cardápio gerado pela IA (nunca muda)
  cardapio_atual TEXT NOT NULL,    -- Versão atual (pode ser editada)
  versao INTEGER DEFAULT 1,        -- Número da versão atual
  editado_manualmente BOOLEAN DEFAULT FALSE,
  
  -- Metadados de geração
  pratos_principais TEXT[] NOT NULL, 
  ingredientes_excluidos TEXT[] DEFAULT '{}', 
  seed_variedade TEXT, 
  estatisticas JSONB,
  
  -- Análise de conteúdo (atualizada a cada edição)
  culinarias_brasileiras TEXT[] DEFAULT '{}',
  culinarias_internacionais TEXT[] DEFAULT '{}',
  tecnicas_culinarias TEXT[] DEFAULT '{}',
  
  -- Controle temporal
  data_geracao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_ultima_edicao TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- CONSTRAINT: apenas 1 cardápio por usuário por semana
  UNIQUE(user_id, ano, semana)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_cardapio_semanal_user_week ON cardapio_semanal(user_id, ano, semana);
CREATE INDEX IF NOT EXISTS idx_cardapio_semanal_user_data ON cardapio_semanal(user_id, data_geracao DESC);
CREATE INDEX IF NOT EXISTS idx_cardapio_semanal_pratos ON cardapio_semanal USING GIN(pratos_principais);

-- RLS (Row Level Security)
ALTER TABLE cardapio_semanal ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Usuários podem ver seus próprios cardápios semanais" ON cardapio_semanal
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar seus próprios cardápios semanais" ON cardapio_semanal
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Função para obter semana atual
CREATE OR REPLACE FUNCTION get_current_week()
RETURNS TABLE(ano INTEGER, semana INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER as ano,
    EXTRACT(WEEK FROM CURRENT_DATE)::INTEGER as semana;
END;
$$ LANGUAGE plpgsql;

-- Função para verificar se usuário já tem cardápio da semana
CREATE OR REPLACE FUNCTION tem_cardapio_semana_atual(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_year INTEGER;
  current_week INTEGER;
  cardapio_exists BOOLEAN;
BEGIN
  -- Obter semana atual
  SELECT ano, semana INTO current_year, current_week FROM get_current_week();
  
  -- Verificar se existe cardápio para esta semana
  SELECT EXISTS(
    SELECT 1 FROM cardapio_semanal 
    WHERE user_id = p_user_id 
      AND ano = current_year 
      AND semana = current_week
  ) INTO cardapio_exists;
  
  RETURN cardapio_exists;
END;
$$ LANGUAGE plpgsql;

-- Função para obter cardápio da semana atual
CREATE OR REPLACE FUNCTION get_cardapio_semana_atual(p_user_id UUID)
RETURNS TABLE(
  id UUID,
  cardapio_original TEXT,
  cardapio_atual TEXT,
  versao INTEGER,
  editado_manualmente BOOLEAN,
  ingredientes_excluidos TEXT[],
  estatisticas JSONB,
  data_geracao TIMESTAMP WITH TIME ZONE,
  data_ultima_edicao TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  current_year INTEGER;
  current_week INTEGER;
BEGIN
  -- Obter semana atual
  SELECT ano, semana INTO current_year, current_week FROM get_current_week();
  
  -- Retornar cardápio da semana atual
  RETURN QUERY
  SELECT 
    cs.id,
    cs.cardapio_original,
    cs.cardapio_atual,
    cs.versao,
    cs.editado_manualmente,
    cs.ingredientes_excluidos,
    cs.estatisticas,
    cs.data_geracao,
    cs.data_ultima_edicao
  FROM cardapio_semanal cs
  WHERE cs.user_id = p_user_id 
    AND cs.ano = current_year 
    AND cs.semana = current_week;
END;
$$ LANGUAGE plpgsql;

-- Função para criar ou atualizar cardápio semanal
CREATE OR REPLACE FUNCTION upsert_cardapio_semanal(
  p_user_id UUID,
  p_cardapio TEXT,
  p_pratos_principais TEXT[],
  p_ingredientes_excluidos TEXT[],
  p_seed_variedade TEXT,
  p_estatisticas JSONB,
  p_culinarias_brasileiras TEXT[],
  p_culinarias_internacionais TEXT[],
  p_tecnicas_culinarias TEXT[],
  p_editado_manualmente BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(
  id UUID,
  versao INTEGER,
  is_new BOOLEAN
) AS $$
DECLARE
  current_year INTEGER;
  current_week INTEGER;
  existing_id UUID;
  new_version INTEGER;
  is_new_record BOOLEAN;
BEGIN
  -- Obter semana atual
  SELECT ano, semana INTO current_year, current_week FROM get_current_week();
  
  -- Verificar se já existe cardápio para esta semana
  SELECT cs.id INTO existing_id
  FROM cardapio_semanal cs
  WHERE cs.user_id = p_user_id 
    AND cs.ano = current_year 
    AND cs.semana = current_week;
  
  IF existing_id IS NOT NULL THEN
    -- Atualizar cardápio existente (nova versão)
    UPDATE cardapio_semanal 
    SET 
      cardapio_atual = p_cardapio,
      versao = versao + 1,
      editado_manualmente = p_editado_manualmente,
      pratos_principais = p_pratos_principais,
      estatisticas = p_estatisticas,
      culinarias_brasileiras = p_culinarias_brasileiras,
      culinarias_internacionais = p_culinarias_internacionais,
      tecnicas_culinarias = p_tecnicas_culinarias,
      data_ultima_edicao = NOW(),
      updated_at = NOW()
    WHERE id = existing_id
    RETURNING versao INTO new_version;
    
    is_new_record := FALSE;
    
  ELSE
    -- Criar novo cardápio semanal
    INSERT INTO cardapio_semanal (
      user_id, ano, semana,
      cardapio_original, cardapio_atual,
      pratos_principais, ingredientes_excluidos,
      seed_variedade, estatisticas,
      culinarias_brasileiras, culinarias_internacionais, tecnicas_culinarias,
      editado_manualmente
    ) VALUES (
      p_user_id, current_year, current_week,
      p_cardapio, p_cardapio,
      p_pratos_principais, p_ingredientes_excluidos,
      p_seed_variedade, p_estatisticas,
      p_culinarias_brasileiras, p_culinarias_internacionais, p_tecnicas_culinarias,
      p_editado_manualmente
    ) RETURNING id INTO existing_id;
    
    new_version := 1;
    is_new_record := TRUE;
  END IF;
  
  RETURN QUERY SELECT existing_id, new_version, is_new_record;
END;
$$ LANGUAGE plpgsql;

-- View para cardápios semanais com informações úteis
CREATE OR REPLACE VIEW cardapio_semanal_info AS
SELECT 
  cs.*,
  -- Calcular se é da semana atual
  (cs.ano = EXTRACT(YEAR FROM CURRENT_DATE) AND 
   cs.semana = EXTRACT(WEEK FROM CURRENT_DATE)) as is_current_week,
  
  -- Calcular próxima semana disponível
  CASE 
    WHEN (cs.ano = EXTRACT(YEAR FROM CURRENT_DATE) AND 
          cs.semana = EXTRACT(WEEK FROM CURRENT_DATE)) 
    THEN (CURRENT_DATE + INTERVAL '7 days')::DATE
    ELSE CURRENT_DATE
  END as proxima_geracao_disponivel,
  
  -- Status do cardápio
  CASE 
    WHEN cs.editado_manualmente THEN 'Personalizado'
    WHEN cs.versao > 1 THEN 'Editado'
    ELSE 'Original'
  END as status_cardapio
FROM cardapio_semanal cs;

-- Função para obter próxima data disponível para gerar cardápio
CREATE OR REPLACE FUNCTION proxima_geracao_disponivel(p_user_id UUID)
RETURNS DATE AS $$
DECLARE
  current_year INTEGER;
  current_week INTEGER;
  has_current BOOLEAN;
BEGIN
  -- Obter semana atual
  SELECT ano, semana INTO current_year, current_week FROM get_current_week();
  
  -- Verificar se já tem cardápio desta semana
  SELECT tem_cardapio_semana_atual(p_user_id) INTO has_current;
  
  IF has_current THEN
    -- Próxima segunda-feira
    RETURN (CURRENT_DATE + INTERVAL '7 days' - INTERVAL (EXTRACT(DOW FROM CURRENT_DATE) - 1) || ' days')::DATE;
  ELSE
    -- Pode gerar hoje
    RETURN CURRENT_DATE;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Comentários para documentação
COMMENT ON TABLE cardapio_semanal IS 'Cardápios semanais dos usuários - máximo 1 por semana';
COMMENT ON COLUMN cardapio_semanal.cardapio_original IS 'Cardápio original gerado pela IA (imutável)';
COMMENT ON COLUMN cardapio_semanal.cardapio_atual IS 'Versão atual do cardápio (pode ser editada)';
COMMENT ON COLUMN cardapio_semanal.versao IS 'Número da versão atual (incrementa a cada edição)';
COMMENT ON COLUMN cardapio_semanal.semana IS 'Semana do ano (1-52) para controle único';
