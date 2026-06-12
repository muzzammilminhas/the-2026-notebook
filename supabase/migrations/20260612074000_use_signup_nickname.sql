create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_name text;
  generated_name text;
begin
  requested_name := trim(new.raw_user_meta_data ->> 'nickname');
  generated_name := 'Fan-' || upper(substr(replace(new.id::text, '-', ''), 1, 6));

  if requested_name is null
    or char_length(requested_name) < 3
    or char_length(requested_name) > 24 then
    requested_name := generated_name;
  end if;

  insert into public.profiles (id, nickname, avatar_seed)
  values (
    new.id,
    requested_name,
    substr(replace(new.id::text, '-', ''), 1, 12)
  );

  insert into public.leaderboard (user_id)
  values (new.id);

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
