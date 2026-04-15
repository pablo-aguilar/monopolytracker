-- Live game state snapshots for host → spectator sync (invite code is the share secret).

create table if not exists public.game_live_snapshots (
  game_id uuid primary key references public.games (id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists game_live_snapshots_updated_at_idx
  on public.game_live_snapshots (updated_at desc);

drop trigger if exists game_live_snapshots_set_updated_at on public.game_live_snapshots;
create trigger game_live_snapshots_set_updated_at
before update on public.game_live_snapshots
for each row execute function public.set_updated_at();

alter table public.game_live_snapshots enable row level security;
alter table public.game_live_snapshots force row level security;

drop policy if exists game_live_snapshots_select_host_or_participant on public.game_live_snapshots;
create policy game_live_snapshots_select_host_or_participant
on public.game_live_snapshots
for select
to authenticated
using (
  exists (
    select 1 from public.games g
    where g.id = game_live_snapshots.game_id
      and g.host_profile_id = auth.uid()
  )
  or exists (
    select 1 from public.game_players gp
    where gp.game_id = game_live_snapshots.game_id
      and gp.profile_id = auth.uid()
  )
);

drop policy if exists game_live_snapshots_insert_host on public.game_live_snapshots;
create policy game_live_snapshots_insert_host
on public.game_live_snapshots
for insert
to authenticated
with check (
  exists (
    select 1 from public.games g
    where g.id = game_live_snapshots.game_id
      and g.host_profile_id = auth.uid()
  )
);

drop policy if exists game_live_snapshots_update_host on public.game_live_snapshots;
create policy game_live_snapshots_update_host
on public.game_live_snapshots
for update
to authenticated
using (
  exists (
    select 1 from public.games g
    where g.id = game_live_snapshots.game_id
      and g.host_profile_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.games g
    where g.id = game_live_snapshots.game_id
      and g.host_profile_id = auth.uid()
  )
);

grant select, insert, update on public.game_live_snapshots to authenticated;

-- Read game row by invite code (RLS blocks in_progress for non-participants; invite link is the capability).
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
  limit 1;
$$;

grant execute on function public.fetch_game_by_invite_code(text) to authenticated;
grant execute on function public.fetch_game_by_invite_code(text) to anon;

-- Snapshot JSON for anyone who knows the invite code (same capability model as the public lobby link).
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
  limit 1;
$$;

grant execute on function public.fetch_live_snapshot_by_invite(text) to authenticated;
grant execute on function public.fetch_live_snapshot_by_invite(text) to anon;

do $pub$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'game_live_snapshots'
  ) then
    execute 'alter publication supabase_realtime add table public.game_live_snapshots';
  end if;
end
$pub$;
