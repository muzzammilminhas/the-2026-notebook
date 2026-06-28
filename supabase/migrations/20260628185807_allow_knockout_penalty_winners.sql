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
