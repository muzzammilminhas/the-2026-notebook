-- Correct the final playoff qualifiers from FIFA's official 2026 draw.
update public.teams set name = '__old_b2' where id = 'B2';
update public.teams
set name = 'Bosnia and Herzegovina',
    aliases = array['Bosnia and Herzegovina', 'Bosnia-Herzegovina', 'Bosnia']
where id = 'B2';

update public.teams set name = '__old_f3' where id = 'F3';
update public.teams
set name = 'Tunisia', aliases = array['Tunisia']
where id = 'F4';
update public.teams
set name = 'Sweden', aliases = array['Sweden']
where id = 'F3';

update public.teams set name = '__old_i3' where id = 'I3';
update public.teams
set name = 'Norway', aliases = array['Norway']
where id = 'I4';
update public.teams
set name = 'Iraq', aliases = array['Iraq']
where id = 'I3';

update public.teams set name = '__old_k2' where id = 'K2';
update public.teams set name = '__old_k4' where id = 'K4';
update public.teams
set name = 'Congo DR', aliases = array['Congo DR', 'DR Congo', 'Congo-Kinshasa']
where id = 'K2';
update public.teams
set name = 'Colombia', aliases = array['Colombia']
where id = 'K4';

update public.teams
set aliases = array['Iran', 'IR Iran', 'Islamic Republic of Iran']
where id = 'G3';

-- FIFA's Date field is UTC. Source fixture ids come from api.fifa.com.
with official_schedule (
  id, match_number, stage, group_id, kickoff_at, source_fixture_id
) as (
  values
    ('A-1',1,'group','A','2026-06-11T19:00:00Z'::timestamptz,'400021443'),
    ('A-2',2,'group','A','2026-06-12T02:00:00Z'::timestamptz,'400021441'),
    ('B-1',3,'group','B','2026-06-12T19:00:00Z'::timestamptz,'400021449'),
    ('D-1',4,'group','D','2026-06-13T01:00:00Z'::timestamptz,'400021458'),
    ('C-2',5,'group','C','2026-06-14T01:00:00Z'::timestamptz,'400021453'),
    ('D-2',6,'group','D','2026-06-14T04:00:00Z'::timestamptz,'400021463'),
    ('C-1',7,'group','C','2026-06-13T22:00:00Z'::timestamptz,'400021456'),
    ('B-2',8,'group','B','2026-06-13T19:00:00Z'::timestamptz,'400021447'),
    ('E-2',9,'group','E','2026-06-14T23:00:00Z'::timestamptz,'400021467'),
    ('E-1',10,'group','E','2026-06-14T17:00:00Z'::timestamptz,'400021464'),
    ('F-1',11,'group','F','2026-06-14T20:00:00Z'::timestamptz,'400021470'),
    ('F-2',12,'group','F','2026-06-15T02:00:00Z'::timestamptz,'400021474'),
    ('H-2',13,'group','H','2026-06-15T22:00:00Z'::timestamptz,'400021486'),
    ('H-1',14,'group','H','2026-06-15T16:00:00Z'::timestamptz,'400021482'),
    ('G-2',15,'group','G','2026-06-16T01:00:00Z'::timestamptz,'400021476'),
    ('G-1',16,'group','G','2026-06-15T19:00:00Z'::timestamptz,'400021478'),
    ('I-1',17,'group','I','2026-06-16T19:00:00Z'::timestamptz,'400021490'),
    ('I-2',18,'group','I','2026-06-16T22:00:00Z'::timestamptz,'400021488'),
    ('J-1',19,'group','J','2026-06-17T01:00:00Z'::timestamptz,'400021496'),
    ('J-2',20,'group','J','2026-06-17T04:00:00Z'::timestamptz,'400021498'),
    ('L-2',21,'group','L','2026-06-17T23:00:00Z'::timestamptz,'400021510'),
    ('L-1',22,'group','L','2026-06-17T20:00:00Z'::timestamptz,'400021507'),
    ('K-1',23,'group','K','2026-06-17T17:00:00Z'::timestamptz,'400021502'),
    ('K-2',24,'group','K','2026-06-18T02:00:00Z'::timestamptz,'400021504'),
    ('A-4',25,'group','A','2026-06-18T16:00:00Z'::timestamptz,'400021440'),
    ('B-4',26,'group','B','2026-06-18T19:00:00Z'::timestamptz,'400021446'),
    ('B-3',27,'group','B','2026-06-18T22:00:00Z'::timestamptz,'400021450'),
    ('A-3',28,'group','A','2026-06-19T01:00:00Z'::timestamptz,'400021442'),
    ('C-3',29,'group','C','2026-06-20T00:30:00Z'::timestamptz,'400021457'),
    ('C-4',30,'group','C','2026-06-19T22:00:00Z'::timestamptz,'400021454'),
    ('D-4',31,'group','D','2026-06-20T03:00:00Z'::timestamptz,'400021460'),
    ('D-3',32,'group','D','2026-06-19T19:00:00Z'::timestamptz,'400021462'),
    ('E-3',33,'group','E','2026-06-20T20:00:00Z'::timestamptz,'400021469'),
    ('E-4',34,'group','E','2026-06-21T00:00:00Z'::timestamptz,'400021465'),
    ('F-3',35,'group','F','2026-06-20T17:00:00Z'::timestamptz,'400021472'),
    ('F-4',36,'group','F','2026-06-21T04:00:00Z'::timestamptz,'400021475'),
    ('H-4',37,'group','H','2026-06-21T22:00:00Z'::timestamptz,'400021487'),
    ('H-3',38,'group','H','2026-06-21T16:00:00Z'::timestamptz,'400021483'),
    ('G-3',39,'group','G','2026-06-21T19:00:00Z'::timestamptz,'400021477'),
    ('G-4',40,'group','G','2026-06-22T01:00:00Z'::timestamptz,'400021480'),
    ('I-4',41,'group','I','2026-06-23T00:00:00Z'::timestamptz,'400021491'),
    ('I-3',42,'group','I','2026-06-22T21:00:00Z'::timestamptz,'400021492'),
    ('J-3',43,'group','J','2026-06-22T17:00:00Z'::timestamptz,'400021494'),
    ('J-4',44,'group','J','2026-06-23T03:00:00Z'::timestamptz,'400021499'),
    ('L-3',45,'group','L','2026-06-23T20:00:00Z'::timestamptz,'400021506'),
    ('L-4',46,'group','L','2026-06-23T23:00:00Z'::timestamptz,'400021511'),
    ('K-3',47,'group','K','2026-06-23T17:00:00Z'::timestamptz,'400021503'),
    ('K-4',48,'group','K','2026-06-24T02:00:00Z'::timestamptz,'400021501'),
    ('C-5',49,'group','C','2026-06-24T22:00:00Z'::timestamptz,'400021455'),
    ('C-6',50,'group','C','2026-06-24T22:00:00Z'::timestamptz,'400021452'),
    ('B-5',51,'group','B','2026-06-24T19:00:00Z'::timestamptz,'400021451'),
    ('B-6',52,'group','B','2026-06-24T19:00:00Z'::timestamptz,'400021448'),
    ('A-5',53,'group','A','2026-06-25T01:00:00Z'::timestamptz,'400021444'),
    ('A-6',54,'group','A','2026-06-25T01:00:00Z'::timestamptz,'400021445'),
    ('E-6',55,'group','E','2026-06-25T20:00:00Z'::timestamptz,'400021468'),
    ('E-5',56,'group','E','2026-06-25T20:00:00Z'::timestamptz,'400021466'),
    ('F-6',57,'group','F','2026-06-25T23:00:00Z'::timestamptz,'400021471'),
    ('F-5',58,'group','F','2026-06-25T23:00:00Z'::timestamptz,'400021473'),
    ('D-5',59,'group','D','2026-06-26T02:00:00Z'::timestamptz,'400021459'),
    ('D-6',60,'group','D','2026-06-26T02:00:00Z'::timestamptz,'400021461'),
    ('I-5',61,'group','I','2026-06-26T19:00:00Z'::timestamptz,'400021489'),
    ('I-6',62,'group','I','2026-06-26T19:00:00Z'::timestamptz,'400021493'),
    ('G-6',63,'group','G','2026-06-27T03:00:00Z'::timestamptz,'400021479'),
    ('G-5',64,'group','G','2026-06-27T03:00:00Z'::timestamptz,'400021481'),
    ('H-6',65,'group','H','2026-06-27T00:00:00Z'::timestamptz,'400021485'),
    ('H-5',66,'group','H','2026-06-27T00:00:00Z'::timestamptz,'400021484'),
    ('L-5',67,'group','L','2026-06-27T21:00:00Z'::timestamptz,'400021508'),
    ('L-6',68,'group','L','2026-06-27T21:00:00Z'::timestamptz,'400021509'),
    ('J-6',69,'group','J','2026-06-28T02:00:00Z'::timestamptz,'400021497'),
    ('J-5',70,'group','J','2026-06-28T02:00:00Z'::timestamptz,'400021495'),
    ('K-5',71,'group','K','2026-06-27T23:30:00Z'::timestamptz,'400021505'),
    ('K-6',72,'group','K','2026-06-27T23:30:00Z'::timestamptz,'400021500'),
    ('M73',73,'r32',null,'2026-06-28T19:00:00Z'::timestamptz,'400021518'),
    ('M74',74,'r32',null,'2026-06-29T20:30:00Z'::timestamptz,'400021513'),
    ('M75',75,'r32',null,'2026-06-30T01:00:00Z'::timestamptz,'400021522'),
    ('M76',76,'r32',null,'2026-06-29T17:00:00Z'::timestamptz,'400021516'),
    ('M77',77,'r32',null,'2026-06-30T21:00:00Z'::timestamptz,'400021523'),
    ('M78',78,'r32',null,'2026-06-30T17:00:00Z'::timestamptz,'400021514'),
    ('M79',79,'r32',null,'2026-07-01T01:00:00Z'::timestamptz,'400021520'),
    ('M80',80,'r32',null,'2026-07-01T16:00:00Z'::timestamptz,'400021512'),
    ('M81',81,'r32',null,'2026-07-02T00:00:00Z'::timestamptz,'400021524'),
    ('M82',82,'r32',null,'2026-07-01T20:00:00Z'::timestamptz,'400021525'),
    ('M83',83,'r32',null,'2026-07-02T23:00:00Z'::timestamptz,'400021526'),
    ('M84',84,'r32',null,'2026-07-02T19:00:00Z'::timestamptz,'400021519'),
    ('M85',85,'r32',null,'2026-07-03T03:00:00Z'::timestamptz,'400021527'),
    ('M86',86,'r32',null,'2026-07-03T22:00:00Z'::timestamptz,'400021521'),
    ('M87',87,'r32',null,'2026-07-04T01:30:00Z'::timestamptz,'400021517'),
    ('M88',88,'r32',null,'2026-07-03T18:00:00Z'::timestamptz,'400021515'),
    ('M89',89,'r16',null,'2026-07-04T21:00:00Z'::timestamptz,'400021533'),
    ('M90',90,'r16',null,'2026-07-04T17:00:00Z'::timestamptz,'400021530'),
    ('M91',91,'r16',null,'2026-07-05T20:00:00Z'::timestamptz,'400021532'),
    ('M92',92,'r16',null,'2026-07-06T00:00:00Z'::timestamptz,'400021531'),
    ('M93',93,'r16',null,'2026-07-06T19:00:00Z'::timestamptz,'400021529'),
    ('M94',94,'r16',null,'2026-07-07T00:00:00Z'::timestamptz,'400021534'),
    ('M95',95,'r16',null,'2026-07-07T16:00:00Z'::timestamptz,'400021528'),
    ('M96',96,'r16',null,'2026-07-07T20:00:00Z'::timestamptz,'400021535'),
    ('M97',97,'qf',null,'2026-07-09T20:00:00Z'::timestamptz,'400021536'),
    ('M98',98,'qf',null,'2026-07-10T19:00:00Z'::timestamptz,'400021538'),
    ('M99',99,'qf',null,'2026-07-11T21:00:00Z'::timestamptz,'400021539'),
    ('M100',100,'qf',null,'2026-07-12T01:00:00Z'::timestamptz,'400021537'),
    ('M101',101,'sf',null,'2026-07-14T19:00:00Z'::timestamptz,'400021541'),
    ('M102',102,'sf',null,'2026-07-15T19:00:00Z'::timestamptz,'400021540'),
    ('M103',103,'third',null,'2026-07-18T21:00:00Z'::timestamptz,'400021542'),
    ('M104',104,'final',null,'2026-07-19T19:00:00Z'::timestamptz,'400021543')
)
insert into public.matches (
  id, match_number, stage, group_id, kickoff_at, source, source_fixture_id
)
select
  id, match_number, stage, group_id, kickoff_at, 'fifa', source_fixture_id
from official_schedule
on conflict (id) do update
set
  match_number = excluded.match_number,
  stage = excluded.stage,
  group_id = excluded.group_id,
  kickoff_at = excluded.kickoff_at,
  source = excluded.source,
  source_fixture_id = excluded.source_fixture_id;

create table public.knockout_predictions (
  user_id uuid not null references auth.users(id) on delete cascade,
  match_number integer not null,
  predicted_winner_team_id text not null references public.teams(id),
  points integer check (points is null or points in (0, 2)),
  result_grade text check (
    result_grade is null or result_grade in ('wrong', 'correct')
  ),
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  scored_at timestamptz,
  primary key (user_id, match_number),
  foreign key (match_number) references public.matches(match_number) on delete cascade
);

create trigger knockout_predictions_touch_updated_at
before update on public.knockout_predictions
for each row execute function public.touch_updated_at();

create or replace function public.guard_knockout_prediction_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  target_match public.matches;
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

  new.points := null;
  new.result_grade := null;
  new.scored_at := null;
  return new;
end;
$$;

create trigger knockout_predictions_guard_write
before insert or update of predicted_winner_team_id
on public.knockout_predictions
for each row execute function public.guard_knockout_prediction_write();

alter table public.leaderboard
  add column group_points integer not null default 0,
  add column knockout_points integer not null default 0,
  add column correct_knockout integer not null default 0;

update public.leaderboard set group_points = points;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

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
      where user_id = target_user and result_grade = 'correct'
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

drop trigger if exists matches_score_predictions on public.matches;
drop function if exists public.score_match_predictions();

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
          when p.predicted_winner_team_id = new.winner_team_id then 2
          else 0
        end,
        result_grade = case
          when p.predicted_winner_team_id = new.winner_team_id then 'correct'
          else 'wrong'
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

create trigger matches_score_predictions
after update on public.matches
for each row execute function private.score_match_predictions();

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
  l.correct_knockout
from public.leaderboard l
join public.profiles p on p.id = l.user_id;

alter table public.knockout_predictions enable row level security;

create policy "users read own knockout predictions"
on public.knockout_predictions for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "users create own knockout predictions"
on public.knockout_predictions for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "users update own knockout predictions"
on public.knockout_predictions for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "users delete unlocked knockout predictions"
on public.knockout_predictions for delete
to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.matches m
    where m.match_number = knockout_predictions.match_number
      and m.status = 'scheduled'
      and (m.kickoff_at is null or m.kickoff_at > now())
  )
);

grant select, insert, update, delete
on public.knockout_predictions
to authenticated;
grant select on public.public_leaderboard to anon, authenticated;
