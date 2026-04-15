-- Admin moderation and soft-trash workflow.
-- Adds trash metadata, admin membership, audit logging, and admin-only RPCs.

alter table public.games
  add column if not exists trashed_at timestamptz,
  add column if not exists trashed_by uuid references public.profiles(id) on delete set null,
  add column if not exists trash_reason text;

alter table public.profiles
  add column if not exists trashed_at timestamptz,
  add column if not exists trashed_by uuid references public.profiles(id) on delete set null,
  add column if not exists trash_reason text;

create index if not exists games_trashed_at_idx on public.games (trashed_at);
create index if not exists profiles_trashed_at_idx on public.profiles (trashed_at);

create table if not exists public.admin_users (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_profile_id uuid references public.profiles(id) on delete set null,
  target_type text not null check (target_type in ('game', 'profile')),
  target_id uuid not null,
  action text not null check (action in ('trash', 'restore', 'hard_delete')),
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_log_created_at_idx on public.admin_audit_log (created_at desc);

alter table public.admin_users enable row level security;
alter table public.admin_users force row level security;
alter table public.admin_audit_log enable row level security;
alter table public.admin_audit_log force row level security;

create or replace function public.is_current_user_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.admin_users au
    where au.profile_id = auth.uid()
  );
$$;

grant execute on function public.is_current_user_admin() to authenticated;

drop policy if exists admin_users_select_admin_only on public.admin_users;
create policy admin_users_select_admin_only
on public.admin_users
for select
to authenticated
using (public.is_current_user_admin());

drop policy if exists admin_users_write_admin_only on public.admin_users;
create policy admin_users_write_admin_only
on public.admin_users
for all
to authenticated
using (public.is_current_user_admin())
with check (public.is_current_user_admin());

drop policy if exists admin_audit_log_select_admin_only on public.admin_audit_log;
create policy admin_audit_log_select_admin_only
on public.admin_audit_log
for select
to authenticated
using (public.is_current_user_admin());

drop policy if exists admin_audit_log_insert_admin_only on public.admin_audit_log;
create policy admin_audit_log_insert_admin_only
on public.admin_audit_log
for insert
to authenticated
with check (public.is_current_user_admin());

create or replace function public.admin_list_games(p_include_trashed boolean default false, p_limit integer default 200)
returns table (
  id uuid,
  host_profile_id uuid,
  status text,
  invite_code text,
  started_at timestamptz,
  ended_at timestamptz,
  winner_profile_id uuid,
  created_at timestamptz,
  trashed_at timestamptz,
  trash_reason text
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not public.is_current_user_admin() then
    raise exception 'admin only';
  end if;

  return query
  select
    g.id,
    g.host_profile_id,
    g.status::text,
    g.invite_code,
    g.started_at,
    g.ended_at,
    g.winner_profile_id,
    g.created_at,
    g.trashed_at,
    g.trash_reason
  from public.games g
  where p_include_trashed or g.trashed_at is null
  order by coalesce(g.ended_at, g.started_at, g.created_at) desc
  limit greatest(1, least(coalesce(p_limit, 200), 1000));
end;
$$;

create or replace function public.admin_list_profiles(p_include_trashed boolean default false, p_limit integer default 200)
returns table (
  id uuid,
  display_name text,
  avatar_key text,
  created_at timestamptz,
  trashed_at timestamptz,
  trash_reason text
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not public.is_current_user_admin() then
    raise exception 'admin only';
  end if;

  return query
  select
    p.id,
    p.display_name,
    p.avatar_key,
    p.created_at,
    p.trashed_at,
    p.trash_reason
  from public.profiles p
  where p_include_trashed or p.trashed_at is null
  order by p.created_at desc
  limit greatest(1, least(coalesce(p_limit, 200), 1000));
end;
$$;

create or replace function public.admin_trash_game(p_game_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_current_user_admin() then
    raise exception 'admin only';
  end if;

  update public.games
  set trashed_at = now(),
      trashed_by = auth.uid(),
      trash_reason = nullif(trim(coalesce(p_reason, '')), '')
  where id = p_game_id;

  insert into public.admin_audit_log(actor_profile_id, target_type, target_id, action, reason)
  values (auth.uid(), 'game', p_game_id, 'trash', nullif(trim(coalesce(p_reason, '')), ''));
end;
$$;

create or replace function public.admin_restore_game(p_game_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_current_user_admin() then
    raise exception 'admin only';
  end if;

  update public.games
  set trashed_at = null,
      trashed_by = null,
      trash_reason = null
  where id = p_game_id;

  insert into public.admin_audit_log(actor_profile_id, target_type, target_id, action)
  values (auth.uid(), 'game', p_game_id, 'restore');
end;
$$;

create or replace function public.admin_delete_game_permanently(p_game_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_current_user_admin() then
    raise exception 'admin only';
  end if;

  delete from public.games
  where id = p_game_id;

  insert into public.admin_audit_log(actor_profile_id, target_type, target_id, action)
  values (auth.uid(), 'game', p_game_id, 'hard_delete');
end;
$$;

create or replace function public.admin_trash_profile(p_profile_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_current_user_admin() then
    raise exception 'admin only';
  end if;

  update public.profiles
  set trashed_at = now(),
      trashed_by = auth.uid(),
      trash_reason = nullif(trim(coalesce(p_reason, '')), '')
  where id = p_profile_id;

  insert into public.admin_audit_log(actor_profile_id, target_type, target_id, action, reason)
  values (auth.uid(), 'profile', p_profile_id, 'trash', nullif(trim(coalesce(p_reason, '')), ''));
end;
$$;

create or replace function public.admin_restore_profile(p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_current_user_admin() then
    raise exception 'admin only';
  end if;

  update public.profiles
  set trashed_at = null,
      trashed_by = null,
      trash_reason = null
  where id = p_profile_id;

  insert into public.admin_audit_log(actor_profile_id, target_type, target_id, action)
  values (auth.uid(), 'profile', p_profile_id, 'restore');
end;
$$;

create or replace function public.admin_delete_profile_permanently(p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  blocked_count integer;
begin
  if not public.is_current_user_admin() then
    raise exception 'admin only';
  end if;

  select count(*)::integer
  into blocked_count
  from public.games g
  where g.host_profile_id = p_profile_id;

  if blocked_count > 0 then
    raise exception 'cannot hard-delete profile with hosted games; trash or delete those games first';
  end if;

  delete from public.profiles
  where id = p_profile_id;

  insert into public.admin_audit_log(actor_profile_id, target_type, target_id, action)
  values (auth.uid(), 'profile', p_profile_id, 'hard_delete');
end;
$$;

grant execute on function public.admin_list_games(boolean, integer) to authenticated;
grant execute on function public.admin_list_profiles(boolean, integer) to authenticated;
grant execute on function public.admin_trash_game(uuid, text) to authenticated;
grant execute on function public.admin_restore_game(uuid) to authenticated;
grant execute on function public.admin_delete_game_permanently(uuid) to authenticated;
grant execute on function public.admin_trash_profile(uuid, text) to authenticated;
grant execute on function public.admin_restore_profile(uuid) to authenticated;
grant execute on function public.admin_delete_profile_permanently(uuid) to authenticated;

-- Keep public-facing feeds clean by excluding trashed entities.
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
  where g.trashed_at is null
  order by coalesce(g.ended_at, g.started_at, g.created_at) desc
  limit greatest(1, least(coalesce(p_limit, 200), 500));
$$;

create or replace function public.fetch_game_by_invite_code(p_invite_code text)
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
  where upper(trim(g.invite_code)) = upper(trim(p_invite_code))
    and g.trashed_at is null
  limit 1;
$$;

create or replace function public.fetch_live_snapshot_by_invite(p_invite_code text)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select gls.payload
  from public.game_live_snapshots gls
  inner join public.games g on g.id = gls.game_id
  where upper(trim(g.invite_code)) = upper(trim(p_invite_code))
    and g.trashed_at is null
  limit 1;
$$;

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
  inner join public.games g on g.id = gp.game_id
  left join public.profiles p on p.id = gp.profile_id
  where gp.profile_id is not null
    and gp.final_place is not null
    and g.trashed_at is null
    and (p.trashed_at is null)
  group by gp.profile_id, p.display_name
  order by
    count(*) filter (where gp.final_place = 1) desc,
    count(*) desc,
    avg(gp.final_place) asc nulls last
  limit greatest(1, least(coalesce(p_limit, 50), 500));
$$;

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
  inner join public.games g on g.id = gp.game_id
  left join public.profiles p on p.id = gp.profile_id
  where gp.profile_id = p_profile_id
    and gp.final_place is not null
    and g.trashed_at is null
    and (p.trashed_at is null)
  group by gp.profile_id;
$$;
