CREATE SCHEMA IF NOT EXISTS extensions;
DROP EXTENSION IF EXISTS pg_net;
CREATE EXTENSION pg_net WITH SCHEMA extensions;

SELECT cron.unschedule('tedbirge-offline-check') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'tedbirge-offline-check'
);

SELECT cron.schedule(
  'tedbirge-offline-check',
  '*/5 * * * *',
  $$
  SELECT extensions.http_post(
    url := 'https://project--04a05552-b64f-40b7-b600-3a1a8e98926b.lovable.app/api/public/cron/offline-check',
    headers := '{"Content-Type": "application/json", "apikey": "sb_publishable_EIRZKj5miJlp5fokAEf9Tg_FdqFqDrA"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);