alter table public.knockout_predictions
  add column if not exists predicted_home integer,
  add column if not exists predicted_away integer;

alter table public.knockout_predictions
  drop constraint if exists knockout_predictions_points_check,
  drop constraint if exists knockout_predictions_result_grade_check,
  add constraint knockout_predictions_points_check
    check (points is null or points in (0, 2, 4, 7, 9)),
  add constraint knockout_predictions_result_grade_check
    check (result_grade is null or result_grade in ('wrong', 'correct', 'exact')),
  add constraint knockout_predictions_scoreline_check
    check (
      (predicted_home is null and predicted_away is null)
      or (
        predicted_home is not null
        and predicted_away is not null
        and predicted_home >= 0
        and predicted_away >= 0
        and predicted_home <= 20
        and predicted_away <= 20
      )
    );

create or replace function public.guard_knockout_prediction_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  target_match public.matches;
  complete_group_entries integer;
  prerequisite_matches integer[];
  prerequisite_teams text[];
begin
  select * into target_match
  from public.matches
  where match_number = new.match_number;

  if target_match.match_number is null then
    raise exception 'Unknown match';
  end if;

  if target_match.stage = 'group' then
    raise exception 'Use score predictions for group matches';
  end if;

  if target_match.status <> 'scheduled'
     or (target_match.kickoff_at is not null and target_match.kickoff_at <= now()) then
    raise exception 'Predictions are locked after kickoff';
  end if;

  if (new.predicted_home is null) <> (new.predicted_away is null) then
    raise exception 'Enter both knockout scores';
  end if;

  if new.predicted_home is not null and new.predicted_home = new.predicted_away then
    raise exception 'Knockout predictions need a winner';
  end if;

  select count(*)::integer
  into complete_group_entries
  from public.matches m
  where m.stage = 'group'
    and (
      (
        m.status = 'finished'
        and m.verified
        and m.home_score is not null
        and m.away_score is not null
      )
      or exists (
        select 1
        from public.predictions p
        where p.user_id = new.user_id
          and p.match_id = m.id
      )
    );

  if complete_group_entries < 72 then
    raise exception 'Complete all 72 group results before knockout predictions';
  end if;

  prerequisite_matches := case new.match_number
    when 89 then array[73, 75]
    when 90 then array[74, 77]
    when 91 then array[76, 78]
    when 92 then array[79, 80]
    when 93 then array[83, 84]
    when 94 then array[81, 82]
    when 95 then array[86, 88]
    when 96 then array[85, 87]
    when 97 then array[89, 90]
    when 98 then array[93, 94]
    when 99 then array[91, 92]
    when 100 then array[95, 96]
    when 101 then array[97, 98]
    when 102 then array[99, 100]
    when 104 then array[101, 102]
    else null
  end;

  if prerequisite_matches is not null then
    select array_agg(
      coalesce(
        (
          select m.winner_team_id
          from public.matches m
          where m.match_number = source_match
            and m.status = 'finished'
            and m.verified
        ),
        (
          select p.predicted_winner_team_id
          from public.knockout_predictions p
          where p.user_id = new.user_id
            and p.match_number = source_match
        )
      )
      order by source_match
    )
    into prerequisite_teams
    from unnest(prerequisite_matches) as source_match;

    if array_position(prerequisite_teams, null) is not null then
      raise exception 'Both previous match winners are required';
    end if;

    if not (new.predicted_winner_team_id = any(prerequisite_teams)) then
      raise exception 'Predicted winner is not in this matchup';
    end if;
  end if;

  new.points := null;
  new.result_grade := null;
  new.scored_at := null;
  return new;
end;
$$;

create or replace function private.score_match_predictions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_user uuid;
begin
  if new.status = 'finished'
     and new.verified
     and (
       old.status is distinct from new.status
       or old.verified is distinct from new.verified
       or old.home_score is distinct from new.home_score
       or old.away_score is distinct from new.away_score
       or old.winner_team_id is distinct from new.winner_team_id
     ) then
    if new.stage = 'group' then
      update public.predictions p
      set
        points = case
          when p.predicted_home = new.home_score
           and p.predicted_away = new.away_score then 3
          when sign(p.predicted_home - p.predicted_away)
             = sign(new.home_score - new.away_score) then 1
          else 0
        end,
        result_grade = case
          when p.predicted_home = new.home_score
           and p.predicted_away = new.away_score then 'exact'
          when sign(p.predicted_home - p.predicted_away)
             = sign(new.home_score - new.away_score) then 'outcome'
          else 'wrong'
        end,
        scored_at = now()
      where p.match_id = new.id;

      for affected_user in
        select user_id from public.predictions where match_id = new.id
      loop
        perform private.recalculate_leaderboard(affected_user);
      end loop;
    elsif new.winner_team_id is not null then
      update public.knockout_predictions p
      set
        points = case
          when p.predicted_winner_team_id <> new.winner_team_id then 0
          when p.predicted_home = new.home_score
           and p.predicted_away = new.away_score
            then 4 + case when new.match_number = 104 then 5 else 0 end
          else 2 + case when new.match_number = 104 then 5 else 0 end
        end,
        result_grade = case
          when p.predicted_winner_team_id <> new.winner_team_id then 'wrong'
          when p.predicted_home = new.home_score
           and p.predicted_away = new.away_score then 'exact'
          else 'correct'
        end,
        scored_at = now()
      where p.match_number = new.match_number;

      for affected_user in
        select user_id
        from public.knockout_predictions
        where match_number = new.match_number
      loop
        perform private.recalculate_leaderboard(affected_user);
      end loop;
    end if;
  end if;

  return new;
end;
$$;

create policy "locked knockout predictions are public"
on public.knockout_predictions for select
to anon, authenticated
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

grant select on public.knockout_predictions to anon;

create or replace view public.community_knockout_predictions
with (security_invoker = true)
as
select
  p.match_number,
  p.user_id,
  pr.nickname,
  pr.avatar_seed,
  pr.favorite_team_id,
  ft.name as favorite_team_name,
  p.predicted_winner_team_id,
  p.predicted_home,
  p.predicted_away,
  p.submitted_at,
  case when m.status = 'finished' and m.verified then p.points end as points,
  case when m.status = 'finished' and m.verified then p.result_grade end as result_grade
from public.knockout_predictions p
join public.matches m on m.match_number = p.match_number
join public.profiles pr on pr.id = p.user_id
left join public.teams ft on ft.id = pr.favorite_team_id;

create or replace view public.community_knockout_prediction_scores
with (security_invoker = true)
as
select
  p.match_number,
  p.predicted_home,
  p.predicted_away,
  count(*)::integer as picks
from public.knockout_predictions p
where p.predicted_home is not null
  and p.predicted_away is not null
group by p.match_number, p.predicted_home, p.predicted_away;

grant select on public.community_knockout_predictions,
  public.community_knockout_prediction_scores
to anon, authenticated;
