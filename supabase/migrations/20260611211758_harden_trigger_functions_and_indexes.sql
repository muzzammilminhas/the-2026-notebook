revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.guard_prediction_write() from public, anon, authenticated;
revoke execute on function public.guard_knockout_prediction_write() from public, anon, authenticated;
revoke execute on function public.touch_updated_at() from public, anon, authenticated;

create index knockout_predictions_match_idx
on public.knockout_predictions(match_number);

create index knockout_predictions_team_idx
on public.knockout_predictions(predicted_winner_team_id);

create index matches_home_team_idx on public.matches(home_team_id);
create index matches_away_team_idx on public.matches(away_team_id);
create index matches_winner_team_idx on public.matches(winner_team_id);
create index result_corrections_match_idx
on public.result_corrections(match_id);
create index result_corrections_corrected_by_idx
on public.result_corrections(corrected_by);
