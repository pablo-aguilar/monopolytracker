-- Fix RLS recursion between games and game_players policies.
-- Root cause: policies on each table queried the other table directly.

create or replace function public.is_game_host(target_game_id uuid, target_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.games g
    where g.id = target_game_id
      and g.host_profile_id = target_user_id
  );
$$;

create or replace function public.is_game_participant(target_game_id uuid, target_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.game_players gp
    where gp.game_id = target_game_id
      and gp.profile_id = target_user_id
  );
$$;

grant execute on function public.is_game_host(uuid, uuid) to authenticated;
grant execute on function public.is_game_participant(uuid, uuid) to authenticated;

drop policy if exists games_select_for_participants on public.games;
create policy games_select_for_participants
on public.games
for select
to authenticated
using (
  host_profile_id = auth.uid()
  or public.is_game_participant(id, auth.uid())
);

drop policy if exists game_players_select_for_participants on public.game_players;
create policy game_players_select_for_participants
on public.game_players
for select
to authenticated
using (
  profile_id = auth.uid()
  or public.is_game_host(game_id, auth.uid())
);

drop policy if exists game_players_insert_host_or_self on public.game_players;
create policy game_players_insert_host_or_self
on public.game_players
for insert
to authenticated
with check (
  public.is_game_host(game_id, auth.uid())
  or (participant_type = 'account' and profile_id = auth.uid())
);

drop policy if exists game_players_update_host_or_self on public.game_players;
create policy game_players_update_host_or_self
on public.game_players
for update
to authenticated
using (
  profile_id = auth.uid()
  or public.is_game_host(game_id, auth.uid())
)
with check (
  profile_id = auth.uid()
  or public.is_game_host(game_id, auth.uid())
);
