-- 🐱 CatButler - CORREÇÃO: Remover Cron Job Automático
-- Execute apenas estas linhas no Supabase Dashboard:

-- Verificar se existe algum cron job ativo e remover
SELECT cron.unschedule('catbutler-cleanup-completed-tasks');
SELECT cron.unschedule('catbutler-cleanup');

-- Verificar se foi removido
SELECT 'Cron jobs removidos com sucesso!' as status;
SELECT jobname FROM cron.job WHERE jobname LIKE '%catbutler%';

-- ✅ Pronto! Agora a limpeza é apenas manual