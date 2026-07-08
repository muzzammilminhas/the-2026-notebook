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
    when 89 then array[74, 77]
    when 90 then array[73, 75]
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

create temp table r16_89_90_prediction_repair
on commit drop
as
select
  p.user_id,
  case
    when p.match_number = 89 and p.predicted_winner_team_id not in ('D2', 'I1')
      then 90
    when p.match_number = 90 and p.predicted_winner_team_id not in ('B1', 'C2')
      then 89
    else p.match_number
  end as match_number,
  p.predicted_winner_team_id,
  p.submitted_at,
  now() as updated_at,
  p.predicted_home,
  p.predicted_away
from public.knockout_predictions p
where p.match_number in (89, 90)
  and exists (
    select 1
    from public.knockout_predictions bad
    where bad.user_id = p.user_id
      and (
        (
          bad.match_number = 89
          and bad.predicted_winner_team_id not in ('D2', 'I1')
        )
        or (
          bad.match_number = 90
          and bad.predicted_winner_team_id not in ('B1', 'C2')
        )
      )
  );

alter table public.knockout_predictions disable trigger knockout_predictions_guard_write;

delete from public.knockout_predictions p
where p.match_number in (89, 90)
  and exists (
    select 1
    from r16_89_90_prediction_repair repair
    where repair.user_id = p.user_id
  );

insert into public.knockout_predictions (
  user_id,
  match_number,
  predicted_winner_team_id,
  points,
  result_grade,
  submitted_at,
  updated_at,
  scored_at,
  predicted_home,
  predicted_away
)
select
  user_id,
  match_number,
  predicted_winner_team_id,
  null,
  null,
  submitted_at,
  now(),
  null,
  predicted_home,
  predicted_away
from r16_89_90_prediction_repair
on conflict (user_id, match_number) do update
set
  predicted_winner_team_id = excluded.predicted_winner_team_id,
  points = null,
  result_grade = null,
  updated_at = excluded.updated_at,
  scored_at = null,
  predicted_home = excluded.predicted_home,
  predicted_away = excluded.predicted_away;

alter table public.knockout_predictions enable trigger knockout_predictions_guard_write;

update public.knockout_predictions p
set
  points = case
    when p.predicted_winner_team_id <> m.winner_team_id then 0
    when p.predicted_home = m.home_score
     and p.predicted_away = m.away_score then 4
    else 2
  end,
  result_grade = case
    when p.predicted_winner_team_id <> m.winner_team_id then 'wrong'
    when p.predicted_home = m.home_score
     and p.predicted_away = m.away_score then 'exact'
    else 'correct'
  end,
  scored_at = now()
from public.matches m
where p.match_number = m.match_number
  and p.match_number in (89, 90)
  and m.status = 'finished'
  and m.verified
  and m.winner_team_id is not null;

do $$
declare
  affected_user uuid;
begin
  for affected_user in
    select distinct user_id
    from public.knockout_predictions
    where match_number in (89, 90)
  loop
    perform private.recalculate_leaderboard(affected_user);
  end loop;
end;
$$;

revoke execute on function public.guard_knockout_prediction_write()
from public, anon, authenticated;
