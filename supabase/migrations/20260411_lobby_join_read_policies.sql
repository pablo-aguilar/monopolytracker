-- Allow invite-link joiners to read lobby games and roster before they have a game_players row.

drop policy if exists games_select_lobby_open on public.games;
create policy games_select_lobby_open
on public.games
for select
to authenticated
using (status = 'lobby');

drop policy if exists game_players_select_lobby_roster on public.game_players;
create policy game_players_select_lobby_roster
on public.game_players
for select
to authenticated
using (
  exists (
    select 1
    from public.games g
    where g.id = game_players.game_id
      and g.status = 'lobby'
  )
);
