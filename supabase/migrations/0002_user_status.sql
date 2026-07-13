-- Pause/delete accounts feature: pausing sets status here (for UI display)
-- and also bans the auth user via the Admin API (for actual login enforcement).
alter table public.profiles add column if not exists status text not null default 'active' check (status in ('active', 'paused'));
