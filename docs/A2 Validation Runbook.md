# A2 Validation Runbook (Supabase Schema + RLS)

## Goal
Verify Phase A database migration and access policies before moving forward with full multiplayer and history UI integration.

## Preconditions
- Supabase project created (staging first).
- Auth users exist for at least:
  - host test account
  - participant test account
- Migration file available at `supabase/migrations/20260409_phase_a_core.sql`.

## Step 1: Apply migration
1. Open Supabase SQL editor in staging.
2. Run migration SQL from `supabase/migrations/20260409_phase_a_core.sql`.
3. Confirm tables exist:
   - `profiles`
   - `games`
   - `game_players`
   - `game_player_stats`

## Step 2: Seed minimal test records
1. Open `supabase/verification/phase_a_rls_checks.sql`.
2. Replace placeholder UUIDs with real `auth.users.id` values.
3. Run sections 1 and 2 (profiles + game + participants).

## Step 3: Validate host permissions
Run section 3 and confirm:
- Host reads own profile.
- Host reads game and roster.
- Host can set `games.status` to `in_progress`.

## Step 4: Validate participant permissions
Run section 4 and confirm:
- Participant reads same game and roster.
- Participant updates own `is_ready`.
- Participant cannot update host-only game status transition.

## Step 5: Validate guest model integrity
Confirm `game_players_identity_chk` behavior:
- `account` row must include `profile_id`.
- `guest` row must include `guest_name` and `guest_avatar_key`.

## Step 6: App-level smoke on staging
- Login via magic link.
- Create online lobby from setup.
- Join lobby from a second account using invite code.
- Toggle readiness from both accounts.
- Start game as host.
- Confirm participant route lands in spectator read-only experience.

## Exit Criteria
- All policy checks pass.
- No unauthorized mutation succeeds.
- Lobby flow works for host/participant with persisted rows in DB.
