-- Leaderboard player aggregates exposed through RPC endpoints.
-- This avoids direct REST reads from a `player_aggregates` relation
-- and provides a stable API for both global rankings and per-player stats.

create or replace function public.list_player_aggregates_for_leaderboard(p_limit integer default 50)
returns table (
  profile_id uuid,
  display_name text,
  games_played integer,
  wins integer,
  average_placement numeric
)
language sql
security definer
set search_path = public
stable
as $$
  select
    gp.profile_id,
    coalesce(p.display_name, 'Player') as display_name,
    count(*)::integer as games_played,
    count(*) filter (where gp.final_place = 1)::integer as wins,
    avg(gp.final_place)::numeric as average_placement
  from public.game_players gp
  left join public.profiles p on p.id = gp.profile_id
  where gp.profile_id is not null
    and gp.final_place is not null
  group by gp.profile_id, p.display_name
  order by
    count(*) filter (where gp.final_place = 1) desc,
    count(*) desc,
    avg(gp.final_place) asc nulls last
  limit greatest(1, least(coalesce(p_limit, 50), 500));
$$;

grant execute on function public.list_player_aggregates_for_leaderboard(integer) to authenticated;

create or replace function public.get_player_lifetime_stats(p_profile_id uuid)
returns table (
  profile_id uuid,
  games_played integer,
  wins integer,
  average_placement numeric
)
language sql
security definer
set search_path = public
stable
as $$
  select
    gp.profile_id,
    count(*)::integer as games_played,
    count(*) filter (where gp.final_place = 1)::integer as wins,
    avg(gp.final_place)::numeric as average_placement
  from public.game_players gp
  where gp.profile_id = p_profile_id
    and gp.final_place is not null
  group by gp.profile_id;
$$;

grant execute on function public.get_player_lifetime_stats(uuid) to authenticated;
