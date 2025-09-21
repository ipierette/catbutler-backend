-- 🐱 CatButler - Configuração de Limpeza Automática
-- Execute este SQL no Supabase Dashboard > SQL Editor (apenas administradores)

-- 1. Habilitar extensão pg_cron (necessário para agendamento automático)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Configurar job diário para limpeza de tarefas antigas
-- Executa todo dia às 02:00 (horário do servidor)
SELECT cron.schedule(
  'catbutler-cleanup-completed-tasks',    -- Nome do job
  '0 2 * * *',                            -- Cron expression: diariamente às 2h
  'SELECT cleanup_completed_tasks();'     -- Comando SQL a executar
);

-- 3. Verificar se o job foi criado com sucesso
SELECT * FROM cron.job WHERE jobname = 'catbutler-cleanup-completed-tasks';

-- 4. Para executar o cleanup manualmente (teste):
SELECT cleanup_completed_tasks();

-- ℹ️ COMANDOS ÚTEIS PARA ADMINISTRAÇÃO:
-- 
-- Ver todos os jobs programados:
-- SELECT * FROM cron.job;
-- 
-- Ver histórico de execuções:
-- SELECT * FROM cron.job_run_details WHERE jobid IN (
--   SELECT jobid FROM cron.job WHERE jobname = 'catbutler-cleanup-completed-tasks'
-- ) ORDER BY start_time DESC;
-- 
-- Remover o job (se necessário):
-- SELECT cron.unschedule('catbutler-cleanup-completed-tasks');
-- 
-- Executar cleanup manual:
-- SELECT cleanup_completed_tasks();

-- ⚠️ IMPORTANTE:
-- - Este job precisa ser configurado por um administrador do Supabase
-- - A extensão pg_cron pode não estar disponível em todos os planos
-- - Se não conseguir configurar o cron, execute manualmente periodicamente:
--   SELECT cleanup_completed_tasks();