create or replace function private.recalculate_leaderboard(target_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  group_total integer;
  knockout_total integer;
begin
  select coalesce(sum(points), 0)::integer
  into group_total
  from public.predictions
  where user_id = target_user;

  select coalesce(sum(points), 0)::integer
  into knockout_total
  from public.knockout_predictions
  where user_id = target_user;

  insert into public.leaderboard (
    user_id,
    points,
    group_points,
    knockout_points,
    exact_scores,
    correct_outcomes,
    correct_knockout,
    scored_predictions,
    updated_at
  )
  select
    target_user,
    group_total + knockout_total,
    group_total,
    knockout_total,
    count(*) filter (where result_grade = 'exact')::integer,
    count(*) filter (where result_grade in ('exact', 'outcome'))::integer,
    (
      select count(*)::integer
      from public.knockout_predictions
      where user_id = target_user and result_grade in ('correct', 'exact')
    ),
    count(*) filter (where scored_at is not null)::integer
      + (
        select count(*)::integer
        from public.knockout_predictions
        where user_id = target_user and scored_at is not null
      ),
    now()
  from public.predictions
  where user_id = target_user
  on conflict (user_id) do update
  set
    points = excluded.points,
    group_points = excluded.group_points,
    knockout_points = excluded.knockout_points,
    exact_scores = excluded.exact_scores,
    correct_outcomes = excluded.correct_outcomes,
    correct_knockout = excluded.correct_knockout,
    scored_predictions = excluded.scored_predictions,
    updated_at = excluded.updated_at;
end;
$$;

do $$
declare
  affected_user uuid;
begin
  for affected_user in
    select user_id from public.leaderboard
  loop
    perform private.recalculate_leaderboard(affected_user);
  end loop;
end;
$$;

delete from public.result_sync_runs
where (status = 'success' and started_at < now() - interval '2 days')
   or (status = 'failed' and started_at < now() - interval '30 days');

do $$
declare
  existing_job bigint;
begin
  select jobid into existing_job
  from cron.job
  where jobname = 'prune-world-cup-sync-runs';

  if existing_job is not null then
    perform cron.unschedule(existing_job);
  end if;
end;
$$;

select cron.schedule(
  'prune-world-cup-sync-runs',
  '17 3 * * *',
  $$
  delete from public.result_sync_runs
  where (status = 'success' and started_at < now() - interval '2 days')
     or (status = 'failed' and started_at < now() - interval '30 days');
  $$
);

revoke all on public.admin_users from anon, authenticated;
revoke all on public.leaderboard from anon, authenticated;
revoke all on public.matches from anon, authenticated;
revoke all on public.predictions from anon, authenticated;
revoke all on public.knockout_predictions from anon, authenticated;
revoke all on public.profiles from anon, authenticated;
revoke all on public.result_corrections from anon, authenticated;
revoke all on public.result_sync_runs from anon, authenticated;
revoke all on public.teams from anon, authenticated;
revoke all on public.user_scenarios from anon, authenticated;

revoke all on public.public_leaderboard from anon, authenticated;
revoke all on public.community_match_predictions from anon, authenticated;
revoke all on public.community_prediction_scores from anon, authenticated;
revoke all on public.community_knockout_predictions from anon, authenticated;
revoke all on public.community_knockout_prediction_scores from anon, authenticated;

grant select on public.matches, public.teams, public.leaderboard
to anon, authenticated;

grant select on public.public_leaderboard,
  public.community_match_predictions,
  public.community_prediction_scores,
  public.community_knockout_predictions,
  public.community_knockout_prediction_scores
to anon, authenticated;

grant select, insert, update, delete on public.predictions,
  public.knockout_predictions,
  public.user_scenarios
to authenticated;

grant select on public.predictions, public.knockout_predictions
to anon;

grant select on public.profiles to anon, authenticated;
grant update (nickname, favorite_team_id) on public.profiles to authenticated;

grant select on public.admin_users,
  public.result_sync_runs,
  public.result_corrections
to authenticated;
