-- Phase A sample seed data for QA environments.
-- Requirements:
-- 1) migration 20260409_phase_a_core.sql already applied
-- 2) profile IDs must exist in auth.users

-- Replace these UUIDs with real auth user IDs from your environment.
-- select id, email from auth.users order by created_at desc;

insert into public.profiles (id, display_name, avatar_key)
values
  ('00000000-0000-0000-0000-000000000001', 'DM Demo', 'hat'),
  ('00000000-0000-0000-0000-000000000002', 'Player Demo', 'dog')
on conflict (id) do update
set display_name = excluded.display_name,
    avatar_key = excluded.avatar_key;

insert into public.games (id, host_profile_id, status, invite_code, started_at)
values
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'in_progress', 'DEMO42', now())
on conflict (invite_code) do update
set status = excluded.status,
    started_at = excluded.started_at;

with g as (
  select id from public.games where invite_code = 'DEMO42'
)
insert into public.game_players (game_id, participant_type, profile_id, seat_order, is_ready)
select id, 'account', '00000000-0000-0000-0000-000000000001', 1, true from g
on conflict do nothing;

with g as (
  select id from public.games where invite_code = 'DEMO42'
)
insert into public.game_players (game_id, participant_type, profile_id, seat_order, is_ready)
select id, 'account', '00000000-0000-0000-0000-000000000002', 2, true from g
on conflict do nothing;

with g as (
  select id from public.games where invite_code = 'DEMO42'
), p as (
  select id as game_player_id, game_id, profile_id
  from public.game_players
  where game_id in (select id from g)
)
insert into public.game_player_stats (game_id, profile_id, game_player_id, turns, rent_paid, rent_received, properties_owned_end, bankrupt_flag)
select game_id, profile_id, game_player_id, 12, 240, 300, 4, false
from p
on conflict (game_id, game_player_id) do update
set turns = excluded.turns,
    rent_paid = excluded.rent_paid,
    rent_received = excluded.rent_received,
    properties_owned_end = excluded.properties_owned_end,
    bankrupt_flag = excluded.bankrupt_flag;
