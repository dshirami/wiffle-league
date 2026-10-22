-- Westside Wiffle League shared database setup
-- Run this entire script in Supabase Dashboard -> SQL Editor.
-- Then create the commissioner Auth user in Dashboard -> Authentication -> Users,
-- copy that user's UUID, and run the one-line INSERT in SUPABASE_SETUP.md.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists public.league_state (
  id integer primary key check (id = 1),
  data jsonb not null default '{"settings":{"leagueName":"Westside Wiffle League","seasonLabel":"OFFICIAL LEAGUE","playoffTeams":"4"},"teams":[],"games":[]}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.league_state (id, data)
values (1, '{"settings":{"leagueName":"Westside Wiffle League","seasonLabel":"OFFICIAL LEAGUE","playoffTeams":"4"},"teams":[],"games":[]}'::jsonb)
on conflict (id) do nothing;

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 70),
  created_at timestamptz not null default now()
);

-- Case-insensitive duplicate protection, including concurrent registrations.
create unique index if not exists players_name_case_insensitive_unique
  on public.players (lower(trim(name)));

create table if not exists private.commissioners (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
revoke all on private.commissioners from public, anon, authenticated;

create or replace function public.is_westside_commissioner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from private.commissioners c
    where c.user_id = (select auth.uid())
  );
$$;
revoke all on function public.is_westside_commissioner() from public;
grant execute on function public.is_westside_commissioner() to anon, authenticated;

alter table public.league_state enable row level security;
alter table public.players enable row level security;

-- Public visitors can read the published league state.
drop policy if exists "League state is publicly readable" on public.league_state;
create policy "League state is publicly readable"
  on public.league_state for select to anon, authenticated using (true);

-- Only a commissioner account listed in the private allowlist can edit league data.
drop policy if exists "Commissioners can update league state" on public.league_state;
create policy "Commissioners can update league state"
  on public.league_state for update to authenticated
  using (public.is_westside_commissioner())
  with check (public.is_westside_commissioner());

-- Open player signup: visitors can view registrations and submit a name.
drop policy if exists "Player list is publicly readable" on public.players;
create policy "Player list is publicly readable"
  on public.players for select to anon, authenticated using (true);
drop policy if exists "Anyone can register a player name" on public.players;
create policy "Anyone can register a player name"
  on public.players for insert to anon, authenticated
  with check (char_length(trim(name)) between 1 and 70);
-- Public users cannot edit or delete registrations. Commissioner may remove a registration if needed.
drop policy if exists "Commissioners can delete player registrations" on public.players;
create policy "Commissioners can delete player registrations"
  on public.players for delete to authenticated using (public.is_westside_commissioner());

grant select on public.league_state to anon, authenticated;
grant update on public.league_state to authenticated;
grant select, insert on public.players to anon, authenticated;
grant delete on public.players to authenticated;

-- Enable database change broadcasts for live updates in connected browsers.
do $$ begin
  alter publication supabase_realtime add table public.league_state;
exception when duplicate_object then null;
when undefined_object then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table public.players;
exception when duplicate_object then null;
when undefined_object then null;
end $$;
