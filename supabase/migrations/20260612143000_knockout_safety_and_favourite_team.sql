alter table public.profiles
add column favorite_team_id text references public.teams(id);

grant update (favorite_team_id) on public.profiles to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_name text;
  requested_favorite text;
  generated_name text;
  final_name text;
  user_suffix text;
begin
  requested_name := trim(new.raw_user_meta_data ->> 'nickname');
  requested_favorite := nullif(trim(new.raw_user_meta_data ->> 'favorite_team_id'), '');
  user_suffix := upper(substr(replace(new.id::text, '-', ''), 1, 6));
  generated_name := 'Fan-' || user_suffix;

  if requested_name is null
    or char_length(requested_name) < 3
    or char_length(requested_name) > 24 then
    requested_name := generated_name;
  end if;

  if requested_favorite is not null and not exists (
    select 1 from public.teams where id = requested_favorite
  ) then
    requested_favorite := null;
  end if;

  final_name := requested_name;
  if exists (
    select 1
    from public.profiles
    where lower(nickname) = lower(final_name)
  ) then
    final_name := left(requested_name, 17) || '-' || user_suffix;
  end if;

  insert into public.profiles (
    id,
    nickname,
    avatar_seed,
    favorite_team_id
  )
  values (
    new.id,
    final_name,
    substr(replace(new.id::text, '-', ''), 1, 12),
    requested_favorite
  );

  insert into public.leaderboard (user_id)
  values (new.id);

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

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

revoke execute on function public.guard_knockout_prediction_write()
from public, anon, authenticated;

drop view public.public_leaderboard;
create view public.public_leaderboard
with (security_invoker = true)
as
select
  l.user_id,
  p.nickname,
  p.avatar_seed,
  l.points,
  l.exact_scores,
  l.correct_outcomes,
  l.scored_predictions,
  l.updated_at,
  l.group_points,
  l.knockout_points,
  l.correct_knockout,
  p.favorite_team_id,
  t.name as favorite_team_name
from public.leaderboard l
join public.profiles p on p.id = l.user_id
left join public.teams t on t.id = p.favorite_team_id;

grant select on public.public_leaderboard to anon, authenticated;

delete from public.knockout_predictions
where (
  select count(*)
  from public.matches
  where stage = 'group'
    and status = 'finished'
    and verified
) < 72;
