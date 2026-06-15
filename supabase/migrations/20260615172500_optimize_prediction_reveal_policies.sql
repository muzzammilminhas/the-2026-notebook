drop policy "users read own predictions" on public.predictions;
drop policy "locked group predictions are public" on public.predictions;

create policy "anonymous users read locked predictions"
on public.predictions for select
to anon
using (
  exists (
    select 1
    from public.matches m
    where m.id = predictions.match_id
      and (
        m.status <> 'scheduled'
        or (m.kickoff_at is not null and m.kickoff_at <= now())
      )
  )
);

create policy "users read own or locked predictions"
on public.predictions for select
to authenticated
using (
  (select auth.uid()) = user_id
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

create index profiles_favorite_team_idx
on public.profiles(favorite_team_id);
