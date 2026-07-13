-- Profiles: one row per auth.users, holds app-specific fields (username login,
-- custom display id, role). Firebase Auth previously stored role in a
-- separate 'users' Firestore doc keyed by uid; this table plays that role.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  custom_id text not null unique,
  full_name text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  employee_name text not null,
  amount numeric not null,
  recipient text not null,
  department text not null,
  reason text not null,
  receipt_date timestamptz not null,
  authorized_by text not null,
  status text not null default 'pending' check (status in ('pending', 'paid')),
  payment_date timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb
);

insert into public.settings (key, value) values
  ('lists', '{"recipients": [], "departments": [], "authorizers": []}'::jsonb),
  ('app', '{"delayTolerance": 5}'::jsonb)
on conflict (key) do nothing;

-- security definer so the policies below can check role without recursing
-- into profiles' own RLS
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.debts enable row level security;
alter table public.settings enable row level security;

-- profiles: a user reads their own row; admins read all (needed for future
-- admin user-listing); writes happen only via service_role from server.ts
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

-- debts: any authenticated user may insert a debt for themselves; only
-- admins may read the full ledger or mark debts paid (matches the app's
-- role-gated UI, now actually enforced server-side instead of client-only)
create policy "debts_insert_own" on public.debts
  for insert with check (user_id = auth.uid());

create policy "debts_select_own_or_admin" on public.debts
  for select using (user_id = auth.uid() or public.is_admin());

create policy "debts_update_admin" on public.debts
  for update using (public.is_admin());

-- settings: any authenticated user may read (UserPanel needs the
-- recipients/departments/authorizers datalist, AdminDebts/Stats need
-- delayTolerance); only admins may change the app config, any authenticated
-- user may extend the lists row (mirrors UserPanel's arrayUnion behavior)
create policy "settings_select_authenticated" on public.settings
  for select using (auth.role() = 'authenticated');

create policy "settings_update_lists" on public.settings
  for update using (key = 'lists' and auth.role() = 'authenticated')
  with check (key = 'lists');

create policy "settings_update_app_admin" on public.settings
  for update using (key = 'app' and public.is_admin())
  with check (key = 'app');

-- realtime for AdminDebts' live feed (replaces Firestore onSnapshot)
alter publication supabase_realtime add table public.debts;
