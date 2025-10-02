-- ============================================
-- 🌍 SUPORTE A TIMEZONE POR USUÁRIO
-- ============================================
-- Adiciona controle de timezone e localização por usuário
-- para cálculos corretos de semana e data

-- 1. Adicionar campos de localização na tabela user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Sao_Paulo',
ADD COLUMN IF NOT EXISTS pais TEXT DEFAULT 'BR',
ADD COLUMN IF NOT EXISTS cidade TEXT,
ADD COLUMN IF NOT EXISTS coordenadas POINT; -- Para futuras funcionalidades de localização

-- 2. Comentários sobre os novos campos
COMMENT ON COLUMN user_profiles.timezone IS 'Timezone do usuário (ex: America/Sao_Paulo, America/New_York)';
COMMENT ON COLUMN user_profiles.pais IS 'Código do país do usuário (ISO 3166-1 alpha-2)';
COMMENT ON COLUMN user_profiles.cidade IS 'Cidade do usuário para contexto local';
COMMENT ON COLUMN user_profiles.coordenadas IS 'Coordenadas geográficas para funcionalidades futuras';

-- 3. Função para obter data/semana no timezone do usuário
CREATE OR REPLACE FUNCTION get_user_current_week(p_user_id UUID)
RETURNS TABLE(ano INTEGER, semana INTEGER, data_local DATE) AS $$
DECLARE
  user_timezone TEXT;
  local_date DATE;
  local_year INTEGER;
  local_week INTEGER;
BEGIN
  -- Buscar timezone do usuário
  SELECT timezone INTO user_timezone 
  FROM user_profiles 
  WHERE id = p_user_id;
  
  -- Se não encontrar timezone, usar padrão brasileiro
  IF user_timezone IS NULL THEN
    user_timezone := 'America/Sao_Paulo';
  END IF;
  
  -- Calcular data local no timezone do usuário
  local_date := (NOW() AT TIME ZONE user_timezone)::DATE;
  local_year := EXTRACT(YEAR FROM local_date);
  local_week := EXTRACT(WEEK FROM local_date);
  
  RETURN QUERY SELECT local_year, local_week, local_date;
END;
$$ LANGUAGE plpgsql;

-- 4. Atualizar função de verificação de cardápio semanal
CREATE OR REPLACE FUNCTION tem_cardapio_semana_atual(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_year INTEGER;
  user_week INTEGER;
  user_date DATE;
  cardapio_exists BOOLEAN;
BEGIN
  -- Obter semana no timezone do usuário
  SELECT ano, semana, data_local INTO user_year, user_week, user_date 
  FROM get_user_current_week(p_user_id);
  
  -- Verificar se existe cardápio para esta semana
  SELECT EXISTS(
    SELECT 1 FROM cardapio_semanal 
    WHERE user_id = p_user_id 
      AND ano = user_year 
      AND semana = user_week
  ) INTO cardapio_exists;
  
  RETURN cardapio_exists;
END;
$$ LANGUAGE plpgsql;

-- 5. Atualizar função de obter cardápio da semana atual
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
  user_year INTEGER;
  user_week INTEGER;
  user_date DATE;
BEGIN
  -- Obter semana no timezone do usuário
  SELECT ano, semana, data_local INTO user_year, user_week, user_date 
  FROM get_user_current_week(p_user_id);
  
  -- Retornar cardápio da semana atual do usuário
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
    AND cs.ano = user_year 
    AND cs.semana = user_week;
END;
$$ LANGUAGE plpgsql;

-- 6. Atualizar função de próxima geração disponível
CREATE OR REPLACE FUNCTION proxima_geracao_disponivel(p_user_id UUID)
RETURNS DATE AS $$
DECLARE
  user_year INTEGER;
  user_week INTEGER;
  user_date DATE;
  has_current BOOLEAN;
  next_monday DATE;
BEGIN
  -- Obter semana no timezone do usuário
  SELECT ano, semana, data_local INTO user_year, user_week, user_date 
  FROM get_user_current_week(p_user_id);
  
  -- Verificar se já tem cardápio desta semana
  SELECT tem_cardapio_semana_atual(p_user_id) INTO has_current;
  
  IF has_current THEN
    -- Calcular próxima segunda-feira no timezone do usuário
    next_monday := user_date + INTERVAL '7 days' - INTERVAL (EXTRACT(DOW FROM user_date) - 1) || ' days';
    RETURN next_monday;
  ELSE
    -- Pode gerar hoje
    RETURN user_date;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 7. Atualizar função upsert para usar timezone do usuário
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
  user_year INTEGER;
  user_week INTEGER;
  user_date DATE;
  existing_id UUID;
  new_version INTEGER;
  is_new_record BOOLEAN;
BEGIN
  -- Obter semana no timezone do usuário
  SELECT ano, semana, data_local INTO user_year, user_week, user_date 
  FROM get_user_current_week(p_user_id);
  
  -- Verificar se já existe cardápio para esta semana
  SELECT cs.id INTO existing_id
  FROM cardapio_semanal cs
  WHERE cs.user_id = p_user_id 
    AND cs.ano = user_year 
    AND cs.semana = user_week;
  
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
      p_user_id, user_year, user_week,
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

-- 8. Função para atualizar timezone do usuário (chamada pelo frontend)
CREATE OR REPLACE FUNCTION update_user_timezone(
  p_user_id UUID,
  p_timezone TEXT,
  p_pais TEXT DEFAULT NULL,
  p_cidade TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE user_profiles 
  SET 
    timezone = p_timezone,
    pais = COALESCE(p_pais, pais),
    cidade = COALESCE(p_cidade, cidade),
    updated_at = NOW()
  WHERE id = p_user_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- 9. View para informações de usuário com timezone
CREATE OR REPLACE VIEW user_info_with_timezone AS
SELECT 
  up.id,
  up.display_name,
  up.timezone,
  up.pais,
  up.cidade,
  -- Calcular data/hora local do usuário
  (NOW() AT TIME ZONE up.timezone) as data_hora_local,
  (NOW() AT TIME ZONE up.timezone)::DATE as data_local,
  EXTRACT(YEAR FROM (NOW() AT TIME ZONE up.timezone)) as ano_local,
  EXTRACT(WEEK FROM (NOW() AT TIME ZONE up.timezone)) as semana_local,
  -- Verificar se tem cardápio desta semana
  EXISTS(
    SELECT 1 FROM cardapio_semanal cs 
    WHERE cs.user_id = up.id 
      AND cs.ano = EXTRACT(YEAR FROM (NOW() AT TIME ZONE up.timezone))
      AND cs.semana = EXTRACT(WEEK FROM (NOW() AT TIME ZONE up.timezone))
  ) as tem_cardapio_semana_atual
FROM user_profiles up;

-- 10. Trigger para detectar timezone automaticamente no primeiro login
CREATE OR REPLACE FUNCTION detect_user_timezone()
RETURNS TRIGGER AS $$
BEGIN
  -- Se não tem timezone definido, tentar detectar pelo metadata do usuário
  IF NEW.timezone IS NULL OR NEW.timezone = 'America/Sao_Paulo' THEN
    -- Aqui você pode implementar lógica para detectar timezone
    -- Por enquanto, manter padrão brasileiro
    NEW.timezone := 'America/Sao_Paulo';
    NEW.pais := 'BR';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger
DROP TRIGGER IF EXISTS trigger_detect_timezone ON user_profiles;
CREATE TRIGGER trigger_detect_timezone
  BEFORE INSERT OR UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION detect_user_timezone();

-- Comentários finais
COMMENT ON COLUMN user_profiles.timezone IS 'Timezone do usuário para cálculos corretos de data/semana';
COMMENT ON VIEW user_info_with_timezone IS 'View com informações do usuário incluindo data/hora local';
