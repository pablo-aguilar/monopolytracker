-- Phase A RLS verification script
-- Run in Supabase SQL editor AFTER applying migrations.
-- Replace UUID placeholders before running.

-- ------------------------------------------------------------
-- 0) Prepare test user IDs from auth.users
-- ------------------------------------------------------------
-- select id, email from auth.users order by created_at desc limit 10;
-- Host UUID:        00000000-0000-0000-0000-000000000001
-- Participant UUID: 00000000-0000-0000-0000-000000000002

-- ------------------------------------------------------------
-- 1) Seed minimal profile rows (service role / SQL editor context)
-- ------------------------------------------------------------
insert into public.profiles (id, display_name, avatar_key)
values
  ('00000000-0000-0000-0000-000000000001', 'Host User', 'hat'),
  ('00000000-0000-0000-0000-000000000002', 'Participant User', 'dog')
on conflict (id) do update
set display_name = excluded.display_name,
    avatar_key = excluded.avatar_key;

-- ------------------------------------------------------------
-- 2) Create one game and participants (host + participant + guest)
-- ------------------------------------------------------------
with g as (
  insert into public.games (host_profile_id, invite_code, status)
  values ('00000000-0000-0000-0000-000000000001', 'A2TEST', 'lobby')
  on conflict (invite_code) do update set status = excluded.status
  returning id
)
insert into public.game_players (game_id, participant_type, profile_id, guest_name, guest_avatar_key, seat_order)
select id, 'account', '00000000-0000-0000-0000-000000000001', null, null, 1 from g
on conflict do nothing;

with g as (
  select id from public.games where invite_code = 'A2TEST'
)
insert into public.game_players (game_id, participant_type, profile_id, guest_name, guest_avatar_key, seat_order)
select id, 'account', '00000000-0000-0000-0000-000000000002', null, null, 2 from g
on conflict do nothing;

with g as (
  select id from public.games where invite_code = 'A2TEST'
)
insert into public.game_players (game_id, participant_type, profile_id, guest_name, guest_avatar_key, seat_order)
select id, 'guest', null, 'Guest One', 'car', 3 from g
on conflict do nothing;

-- ------------------------------------------------------------
-- 3) Simulate authenticated HOST and assert reads/updates
-- ------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);

-- host can read own profile
select * from public.profiles where id = '00000000-0000-0000-0000-000000000001';

-- host can read game + participants
select * from public.games where invite_code = 'A2TEST';
select * from public.game_players where game_id in (select id from public.games where invite_code = 'A2TEST');

-- host can transition status
update public.games
set status = 'in_progress', started_at = now()
where invite_code = 'A2TEST';

reset role;

-- ------------------------------------------------------------
-- 4) Simulate authenticated PARTICIPANT and assert restrictions
-- ------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);

-- participant can read same game and participants
select * from public.games where invite_code = 'A2TEST';
select * from public.game_players where game_id in (select id from public.games where invite_code = 'A2TEST');

-- participant can toggle own readiness
update public.game_players
set is_ready = true
where game_id in (select id from public.games where invite_code = 'A2TEST')
  and profile_id = '00000000-0000-0000-0000-000000000002';

-- participant should NOT be allowed to start game (expect RLS failure)
-- update public.games set status = 'finished' where invite_code = 'A2TEST';

reset role;

-- ------------------------------------------------------------
-- 5) Cleanup test data (optional)
-- ------------------------------------------------------------
-- delete from public.game_player_stats where game_id in (select id from public.games where invite_code = 'A2TEST');
-- delete from public.game_players where game_id in (select id from public.games where invite_code = 'A2TEST');
-- delete from public.games where invite_code = 'A2TEST';
-- delete from public.profiles where id in (
--   '00000000-0000-0000-0000-000000000001',
--   '00000000-0000-0000-0000-000000000002'
-- );
