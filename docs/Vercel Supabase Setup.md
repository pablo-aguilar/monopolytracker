# Vercel + Supabase Setup

## 1) Environment variables
Set these in Vercel for both Preview and Production:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Do not expose `service_role` keys to the client app.

## 2) Supabase auth URL settings
In Supabase Auth settings:
- Set Site URL to your production Vercel URL.
- Add Redirect URLs:
  - `http://localhost:5173/auth/callback`
  - `https://<your-preview-domain>/auth/callback`
  - `https://<your-production-domain>/auth/callback`

## 3) Database migration workflow
- Apply SQL from `supabase/migrations/*` in a staging project first.
- Validate RLS with two authenticated users:
  - host user
  - participant user
- Promote migration to production once checks pass.

## 4) Post-deploy smoke checks
- Magic-link login completes and returns to app route.
- Host can create lobby and receive invite code.
- Participant can join via invite and ready up.
- Host can start game and participant cannot trigger host-only actions.
