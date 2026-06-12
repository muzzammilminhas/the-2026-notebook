create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

do $$
declare
  existing_job bigint;
begin
  select jobid into existing_job
  from cron.job
  where jobname = 'sync-world-cup-results';

  if existing_job is not null then
    perform cron.unschedule(existing_job);
  end if;
end;
$$;

select cron.schedule(
  'sync-world-cup-results',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://hujcjffajinxzbneaqrt.supabase.co/functions/v1/sync-results',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'sync_results_secret'
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 25000
  );
  $$
);
