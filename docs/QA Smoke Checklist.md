# QA Smoke Checklist

## Authentication
- [ ] User can request magic link from `/login`.
- [ ] Callback returns user to requested route.
- [ ] First login creates `profiles` row.

## Lobby Flow
- [ ] Host creates online lobby from setup.
- [ ] Invite code is visible and shareable.
- [ ] Participant joins lobby via `/lobby/:inviteCode`.
- [ ] Host and participant can toggle ready state.
- [ ] Host can start game only when roster is ready.

## Spectator Behavior
- [ ] Non-host is routed to spectator view when game starts.
- [ ] Spectator receives live status updates (polling).
- [ ] Spectator cannot access host gameplay controls.
- [ ] Direct navigation to `/play` while spectator redirects away.

## Data Integrity
- [ ] `games` row created for lobby.
- [ ] `game_players` rows created for host and participants.
- [ ] Guest rows satisfy guest constraints.
- [ ] Service calls fail with clear error when unauthorized.

## Deployment
- [ ] Vercel preview env vars are set.
- [ ] Production env vars are set.
- [ ] Supabase auth redirect URLs include local/preview/prod callback routes.
