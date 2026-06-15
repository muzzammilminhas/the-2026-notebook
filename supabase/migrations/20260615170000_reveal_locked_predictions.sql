create policy "locked group predictions are public"
on public.predictions for select
to anon, authenticated
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

grant select on public.predictions to anon;

create view public.community_match_predictions
with (security_invoker = true)
as
select
  p.match_id,
  p.user_id,
  pr.nickname,
  pr.avatar_seed,
  pr.favorite_team_id,
  ft.name as favorite_team_name,
  p.predicted_home,
  p.predicted_away,
  p.submitted_at,
  case when m.status = 'finished' and m.verified then p.points end as points,
  case when m.status = 'finished' and m.verified then p.result_grade end as result_grade
from public.predictions p
join public.matches m on m.id = p.match_id
join public.profiles pr on pr.id = p.user_id
left join public.teams ft on ft.id = pr.favorite_team_id;

create view public.community_prediction_scores
with (security_invoker = true)
as
select
  p.match_id,
  p.predicted_home,
  p.predicted_away,
  count(*)::integer as picks
from public.predictions p
group by p.match_id, p.predicted_home, p.predicted_away;

grant select on public.community_match_predictions,
  public.community_prediction_scores
to anon, authenticated;
