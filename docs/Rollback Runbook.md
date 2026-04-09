# Rollback Runbook

## When to rollback
- Critical auth failure (users locked out).
- RLS regression blocks valid host/participant operations.
- Lobby start/join path is broken in production.

## Immediate app fallback
1. Deploy previous known-good commit on Vercel.
2. Keep env vars unchanged unless issue is credential/config related.
3. Announce temporary fallback to local setup/start path if needed.

## Database rollback strategy
This migration creates new tables and policies. Preferred rollback is:
- Disable new frontend flows first (route guard/feature path rollback via code deploy).
- Keep schema in place if it does not break legacy flow.
- If full DB rollback is required:
  - remove policy objects
  - drop triggers/functions introduced by migration
  - drop new tables in dependency order:
    1. `game_player_stats`
    2. `game_players`
    3. `games`
    4. `profiles`

## Verification after rollback
- App loads setup page and local play flow still works.
- Login and callback routes do not crash.
- No unhandled runtime errors in browser console.

## Re-enable checklist
- Fix identified issue in staging.
- Re-run `docs/A2 Validation Runbook.md`.
- Re-run `docs/QA Smoke Checklist.md`.
- Promote fixed build to production.
