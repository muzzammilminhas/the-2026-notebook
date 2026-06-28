drop policy if exists "locked knockout predictions are public"
on public.knockout_predictions;

drop policy if exists "users read own or admin knockout predictions"
on public.knockout_predictions;

create policy "anon read locked knockout predictions"
on public.knockout_predictions for select
to anon
using (
  exists (
    select 1
    from public.matches m
    where m.match_number = knockout_predictions.match_number
      and (
        m.status <> 'scheduled'
        or (m.kickoff_at is not null and m.kickoff_at <= now())
      )
  )
);

create policy "authenticated read own admin or locked knockout predictions"
on public.knockout_predictions for select
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
    where m.match_number = knockout_predictions.match_number
      and (
        m.status <> 'scheduled'
        or (m.kickoff_at is not null and m.kickoff_at <= now())
      )
  )
);
