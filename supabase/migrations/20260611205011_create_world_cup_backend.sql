create extension if not exists pgcrypto;

create table public.teams (
  id text primary key,
  group_id text not null check (group_id ~ '^[A-L]$'),
  name text not null unique,
  aliases text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.matches (
  id text primary key,
  match_number integer unique,
  stage text not null default 'group'
    check (stage in ('group', 'r32', 'r16', 'qf', 'sf', 'third', 'final')),
  group_id text check (group_id is null or group_id ~ '^[A-L]$'),
  matchday integer,
  home_team_id text references public.teams(id),
  away_team_id text references public.teams(id),
  kickoff_at timestamptz,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'live', 'finished', 'postponed', 'cancelled')),
  home_score integer check (home_score is null or home_score >= 0),
  away_score integer check (away_score is null or away_score >= 0),
  winner_team_id text references public.teams(id),
  source text,
  source_fixture_id text,
  source_payload jsonb,
  verified boolean not null default false,
  verification_note text,
  synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint different_teams check (
    home_team_id is null or away_team_id is null or home_team_id <> away_team_id
  ),
  constraint finished_has_score check (
    status <> 'finished' or (home_score is not null and away_score is not null)
  )
);

create index matches_kickoff_idx on public.matches(kickoff_at);
create index matches_status_idx on public.matches(status);
create index matches_source_fixture_idx on public.matches(source, source_fixture_id);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null unique
    check (char_length(nickname) between 3 and 24),
  avatar_seed text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.predictions (
  user_id uuid not null references auth.users(id) on delete cascade,
  match_id text not null references public.matches(id) on delete cascade,
  predicted_home integer not null check (predicted_home between 0 and 20),
  predicted_away integer not null check (predicted_away between 0 and 20),
  points integer check (points is null or points in (0, 1, 3)),
  result_grade text check (
    result_grade is null or result_grade in ('wrong', 'outcome', 'exact')
  ),
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  scored_at timestamptz,
  primary key (user_id, match_id)
);

create index predictions_match_idx on public.predictions(match_id);

create table public.user_scenarios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  scores jsonb not null default '{}',
  picks jsonb not null default '{}',
  is_public boolean not null default false,
  share_slug text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index user_scenarios_user_idx on public.user_scenarios(user_id);

create table public.leaderboard (
  user_id uuid primary key references auth.users(id) on delete cascade,
  points integer not null default 0,
  exact_scores integer not null default 0,
  correct_outcomes integer not null default 0,
  scored_predictions integer not null default 0,
  updated_at timestamptz not null default now()
);

create table public.result_sync_runs (
  id bigint generated always as identity primary key,
  provider text not null,
  status text not null check (status in ('running', 'success', 'partial', 'failed')),
  fixtures_received integer not null default 0,
  fixtures_updated integer not null default 0,
  error_message text,
  details jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create table public.result_corrections (
  id bigint generated always as identity primary key,
  match_id text not null references public.matches(id),
  previous_value jsonb not null,
  corrected_value jsonb not null,
  reason text not null,
  corrected_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger matches_touch_updated_at
before update on public.matches
for each row execute function public.touch_updated_at();

create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

create trigger predictions_touch_updated_at
before update on public.predictions
for each row execute function public.touch_updated_at();

create trigger scenarios_touch_updated_at
before update on public.user_scenarios
for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  generated_name text;
begin
  generated_name := 'Fan-' || upper(substr(replace(new.id::text, '-', ''), 1, 6));

  insert into public.profiles (id, nickname, avatar_seed)
  values (new.id, generated_name, substr(replace(new.id::text, '-', ''), 1, 12));

  insert into public.leaderboard (user_id)
  values (new.id);

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.guard_prediction_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  target_match public.matches;
begin
  select * into target_match
  from public.matches
  where id = new.match_id;

  if target_match.id is null then
    raise exception 'Unknown match';
  end if;

  if target_match.status <> 'scheduled' then
    raise exception 'Predictions are locked after kickoff';
  end if;

  if target_match.kickoff_at is not null and target_match.kickoff_at <= now() then
    raise exception 'Predictions are locked after kickoff';
  end if;

  new.points := null;
  new.result_grade := null;
  new.scored_at := null;
  return new;
end;
$$;

create trigger predictions_guard_write
before insert or update of predicted_home, predicted_away on public.predictions
for each row execute function public.guard_prediction_write();

create or replace function public.score_match_predictions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'finished'
     and new.verified
     and new.home_score is not null
     and new.away_score is not null
     and (
       old.status is distinct from new.status
       or old.verified is distinct from new.verified
       or old.home_score is distinct from new.home_score
       or old.away_score is distinct from new.away_score
     ) then

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

    insert into public.leaderboard (
      user_id,
      points,
      exact_scores,
      correct_outcomes,
      scored_predictions,
      updated_at
    )
    select
      p.user_id,
      coalesce(sum(p.points), 0)::integer,
      count(*) filter (where p.result_grade = 'exact')::integer,
      count(*) filter (where p.result_grade in ('exact', 'outcome'))::integer,
      count(*) filter (where p.scored_at is not null)::integer,
      now()
    from public.predictions p
    where p.user_id in (
      select affected.user_id
      from public.predictions affected
      where affected.match_id = new.id
    )
    group by p.user_id
    on conflict (user_id) do update
    set
      points = excluded.points,
      exact_scores = excluded.exact_scores,
      correct_outcomes = excluded.correct_outcomes,
      scored_predictions = excluded.scored_predictions,
      updated_at = excluded.updated_at;
  end if;

  return new;
end;
$$;

create trigger matches_score_predictions
after update on public.matches
for each row execute function public.score_match_predictions();

create or replace view public.public_leaderboard
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
  l.updated_at
from public.leaderboard l
join public.profiles p on p.id = l.user_id;

alter table public.teams enable row level security;
alter table public.matches enable row level security;
alter table public.profiles enable row level security;
alter table public.predictions enable row level security;
alter table public.user_scenarios enable row level security;
alter table public.leaderboard enable row level security;
alter table public.result_sync_runs enable row level security;
alter table public.result_corrections enable row level security;

create policy "teams are public"
on public.teams for select
to anon, authenticated
using (true);

create policy "matches are public"
on public.matches for select
to anon, authenticated
using (true);

create policy "profiles are public"
on public.profiles for select
to anon, authenticated
using (true);

create policy "users update own profile"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "users read own predictions"
on public.predictions for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "users create own predictions"
on public.predictions for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "users update own predictions"
on public.predictions for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "users delete unlocked predictions"
on public.predictions for delete
to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.matches m
    where m.id = match_id
      and m.status = 'scheduled'
      and (m.kickoff_at is null or m.kickoff_at > now())
  )
);

create policy "users read own scenarios"
on public.user_scenarios for select
to authenticated
using ((select auth.uid()) = user_id or is_public);

create policy "users create own scenarios"
on public.user_scenarios for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "users update own scenarios"
on public.user_scenarios for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "users delete own scenarios"
on public.user_scenarios for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "leaderboard is public"
on public.leaderboard for select
to anon, authenticated
using (true);

grant usage on schema public to anon, authenticated;
grant select on public.teams, public.matches, public.profiles, public.leaderboard, public.public_leaderboard
to anon, authenticated;
grant select, insert, update, delete on public.predictions, public.user_scenarios
to authenticated;
grant update (nickname) on public.profiles to authenticated;

insert into public.teams (id, group_id, name, aliases) values
('A1', 'A', 'Mexico', array['Mexico']),
('A2', 'A', 'South Africa', array['South Africa']),
('A3', 'A', 'Korea Republic', array['South Korea', 'Korea Republic']),
('A4', 'A', 'Czechia', array['Czech Republic', 'Czechia']),
('B1', 'B', 'Canada', array['Canada']),
('B2', 'B', 'Italy', array['Italy']),
('B3', 'B', 'Qatar', array['Qatar']),
('B4', 'B', 'Switzerland', array['Switzerland']),
('C1', 'C', 'Brazil', array['Brazil']),
('C2', 'C', 'Morocco', array['Morocco']),
('C3', 'C', 'Haiti', array['Haiti']),
('C4', 'C', 'Scotland', array['Scotland']),
('D1', 'D', 'USA', array['USA', 'United States']),
('D2', 'D', 'Paraguay', array['Paraguay']),
('D3', 'D', 'Australia', array['Australia']),
('D4', 'D', 'Türkiye', array['Turkey', 'Türkiye']),
('E1', 'E', 'Germany', array['Germany']),
('E2', 'E', 'Curaçao', array['Curacao', 'Curaçao']),
('E3', 'E', 'Côte d’Ivoire', array['Ivory Coast', 'Côte d’Ivoire']),
('E4', 'E', 'Ecuador', array['Ecuador']),
('F1', 'F', 'Netherlands', array['Netherlands']),
('F2', 'F', 'Japan', array['Japan']),
('F3', 'F', 'Tunisia', array['Tunisia']),
('F4', 'F', 'Ukraine', array['Ukraine']),
('G1', 'G', 'Belgium', array['Belgium']),
('G2', 'G', 'Egypt', array['Egypt']),
('G3', 'G', 'Iran', array['Iran']),
('G4', 'G', 'New Zealand', array['New Zealand']),
('H1', 'H', 'Spain', array['Spain']),
('H2', 'H', 'Cabo Verde', array['Cape Verde', 'Cabo Verde']),
('H3', 'H', 'Saudi Arabia', array['Saudi Arabia']),
('H4', 'H', 'Uruguay', array['Uruguay']),
('I1', 'I', 'France', array['France']),
('I2', 'I', 'Senegal', array['Senegal']),
('I3', 'I', 'Norway', array['Norway']),
('I4', 'I', 'Bolivia', array['Bolivia']),
('J1', 'J', 'Argentina', array['Argentina']),
('J2', 'J', 'Algeria', array['Algeria']),
('J3', 'J', 'Austria', array['Austria']),
('J4', 'J', 'Jordan', array['Jordan']),
('K1', 'K', 'Portugal', array['Portugal']),
('K2', 'K', 'Colombia', array['Colombia']),
('K3', 'K', 'Uzbekistan', array['Uzbekistan']),
('K4', 'K', 'DR Congo', array['DR Congo', 'Congo DR']),
('L1', 'L', 'England', array['England']),
('L2', 'L', 'Croatia', array['Croatia']),
('L3', 'L', 'Ghana', array['Ghana']),
('L4', 'L', 'Panama', array['Panama']);

insert into public.matches (
  id, stage, group_id, matchday, home_team_id, away_team_id
)
select
  g || '-' || pairing.fixture,
  'group',
  g,
  ((pairing.fixture - 1) / 2) + 1,
  g || pairing.home_pos,
  g || pairing.away_pos
from unnest(array['A','B','C','D','E','F','G','H','I','J','K','L']) as g
cross join (
  values
    (1, 1, 2),
    (2, 3, 4),
    (3, 1, 3),
    (4, 4, 2),
    (5, 4, 1),
    (6, 2, 3)
) as pairing(fixture, home_pos, away_pos);
