-- Phase A core schema and RLS for accounts, lobbies, and game stats.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  host_profile_id uuid not null references public.profiles(id) on delete restrict,
  status text not null check (status in ('lobby', 'in_progress', 'finished')) default 'lobby',
  invite_code text not null unique,
  started_at timestamptz,
  ended_at timestamptz,
  winner_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.game_players (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  participant_type text not null check (participant_type in ('account', 'guest')),
  profile_id uuid references public.profiles(id) on delete set null,
  guest_name text,
  guest_avatar_key text,
  seat_order integer not null,
  is_ready boolean not null default false,
  final_place integer,
  money_end integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint game_players_identity_chk check (
    (participant_type = 'account' and profile_id is not null and guest_name is null and guest_avatar_key is null) or
    (participant_type = 'guest' and profile_id is null and guest_name is not null and guest_avatar_key is not null)
  ),
  unique (game_id, seat_order)
);

create table if not exists public.game_player_stats (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  game_player_id uuid not null references public.game_players(id) on delete cascade,
  turns integer not null default 0,
  rent_paid integer not null default 0,
  rent_received integer not null default 0,
  properties_owned_end integer not null default 0,
  bankrupt_flag boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (game_id, game_player_id)
);

create index if not exists games_host_profile_id_created_at_idx
  on public.games (host_profile_id, created_at desc);

create index if not exists game_players_game_id_profile_id_idx
  on public.game_players (game_id, profile_id);

create index if not exists game_player_stats_game_id_profile_id_idx
  on public.game_player_stats (game_id, profile_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists games_set_updated_at on public.games;
create trigger games_set_updated_at
before update on public.games
for each row execute function public.set_updated_at();

drop trigger if exists game_players_set_updated_at on public.game_players;
create trigger game_players_set_updated_at
before update on public.game_players
for each row execute function public.set_updated_at();

drop trigger if exists game_player_stats_set_updated_at on public.game_player_stats;
create trigger game_player_stats_set_updated_at
before update on public.game_player_stats
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.games enable row level security;
alter table public.game_players enable row level security;
alter table public.game_player_stats enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists games_select_for_participants on public.games;
create policy games_select_for_participants
on public.games
for select
to authenticated
using (
  host_profile_id = auth.uid()
  or exists (
    select 1 from public.game_players gp
    where gp.game_id = games.id and gp.profile_id = auth.uid()
  )
);

drop policy if exists games_insert_host_only on public.games;
create policy games_insert_host_only
on public.games
for insert
to authenticated
with check (host_profile_id = auth.uid());

drop policy if exists games_update_host_only on public.games;
create policy games_update_host_only
on public.games
for update
to authenticated
using (host_profile_id = auth.uid())
with check (
  host_profile_id = auth.uid()
  and status in ('lobby', 'in_progress', 'finished')
);

drop policy if exists game_players_select_for_participants on public.game_players;
create policy game_players_select_for_participants
on public.game_players
for select
to authenticated
using (
  profile_id = auth.uid()
  or exists (
    select 1 from public.games g
    where g.id = game_players.game_id and g.host_profile_id = auth.uid()
  )
);

drop policy if exists game_players_insert_host_or_self on public.game_players;
create policy game_players_insert_host_or_self
on public.game_players
for insert
to authenticated
with check (
  exists (
    select 1 from public.games g
    where g.id = game_players.game_id
      and (
        g.host_profile_id = auth.uid()
        or (game_players.participant_type = 'account' and game_players.profile_id = auth.uid())
      )
  )
);

drop policy if exists game_players_update_host_or_self on public.game_players;
create policy game_players_update_host_or_self
on public.game_players
for update
to authenticated
using (
  profile_id = auth.uid()
  or exists (
    select 1 from public.games g
    where g.id = game_players.game_id and g.host_profile_id = auth.uid()
  )
)
with check (
  profile_id = auth.uid()
  or exists (
    select 1 from public.games g
    where g.id = game_players.game_id and g.host_profile_id = auth.uid()
  )
);

drop policy if exists game_player_stats_select_for_participants on public.game_player_stats;
create policy game_player_stats_select_for_participants
on public.game_player_stats
for select
to authenticated
using (
  profile_id = auth.uid()
  or exists (
    select 1
    from public.games g
    where g.id = game_player_stats.game_id and g.host_profile_id = auth.uid()
  )
  or exists (
    select 1
    from public.game_players gp
    where gp.game_id = game_player_stats.game_id and gp.profile_id = auth.uid()
  )
);

drop policy if exists game_player_stats_insert_host_only on public.game_player_stats;
create policy game_player_stats_insert_host_only
on public.game_player_stats
for insert
to authenticated
with check (
  exists (
    select 1 from public.games g
    where g.id = game_player_stats.game_id and g.host_profile_id = auth.uid()
  )
);

drop policy if exists game_player_stats_update_host_only on public.game_player_stats;
create policy game_player_stats_update_host_only
on public.game_player_stats
for update
to authenticated
using (
  exists (
    select 1 from public.games g
    where g.id = game_player_stats.game_id and g.host_profile_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.games g
    where g.id = game_player_stats.game_id and g.host_profile_id = auth.uid()
  )
);
