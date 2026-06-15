create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

create policy "admins read own admin marker"
on public.admin_users for select
to authenticated
using ((select auth.uid()) = user_id);

grant select on public.admin_users to authenticated;

insert into public.admin_users (user_id)
select id
from public.profiles
where nickname = 'Muzi'
on conflict (user_id) do nothing;

drop policy "users read own or locked predictions" on public.predictions;

create policy "users read own locked or admin predictions"
on public.predictions for select
to authenticated
using (
  (select auth.uid()) = user_id
  or exists (
    select 1
    from public.admin_users a
    where a.user_id = (select auth.uid())
  )
  or exists (
    select 1
    from public.matches m
    where m.id = predictions.match_id
      and (
        m.status <> 'scheduled'
        or (m.kickoff_at is not null and m.kickoff_at <= now())
      )
  )
);

drop policy "users read own knockout predictions" on public.knockout_predictions;

create policy "users read own or admin knockout predictions"
on public.knockout_predictions for select
to authenticated
using (
  (select auth.uid()) = user_id
  or exists (
    select 1
    from public.admin_users a
    where a.user_id = (select auth.uid())
  )
);

create policy "admins read sync runs"
on public.result_sync_runs for select
to authenticated
using (
  exists (
    select 1
    from public.admin_users a
    where a.user_id = (select auth.uid())
  )
);

create policy "admins read result corrections"
on public.result_corrections for select
to authenticated
using (
  exists (
    select 1
    from public.admin_users a
    where a.user_id = (select auth.uid())
  )
);

grant select on public.result_sync_runs, public.result_corrections
to authenticated;
