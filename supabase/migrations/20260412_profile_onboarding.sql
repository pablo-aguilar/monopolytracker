-- Track whether the user completed first-time name + avatar setup.

alter table public.profiles
  add column if not exists onboarding_completed boolean not null default false;

-- Existing rows (created before this column) are treated as onboarded.
update public.profiles
set onboarding_completed = true
where onboarding_completed is distinct from true;
