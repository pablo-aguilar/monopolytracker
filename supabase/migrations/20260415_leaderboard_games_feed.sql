-- Leaderboard-wide game feed for authenticated users.
-- Uses SECURITY DEFINER so app clients can read cross-game summaries
-- without being constrained by participant-scoped RLS.

create or replace function public.list_games_for_leaderboard(p_limit integer default 200)
returns table (
  id uuid,
  host_profile_id uuid,
  status text,
  invite_code text,
  started_at timestamptz,
  ended_at timestamptz,
  winner_profile_id uuid
)
language sql
security definer
set search_path = public
stable
as $$
  select
    g.id,
    g.host_profile_id,
    g.status::text,
    g.invite_code,
    g.started_at,
    g.ended_at,
    g.winner_profile_id
  from public.games g
  order by coalesce(g.ended_at, g.started_at, g.created_at) desc
  limit greatest(1, least(coalesce(p_limit, 200), 500));
$$;

grant execute on function public.list_games_for_leaderboard(integer) to authenticated;
