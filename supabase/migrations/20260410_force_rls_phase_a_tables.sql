-- Ensure RLS cannot be bypassed by table owner contexts.

alter table public.profiles force row level security;
alter table public.games force row level security;
alter table public.game_players force row level security;
alter table public.game_player_stats force row level security;
