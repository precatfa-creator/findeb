-- Admins can cancel a debt entry for audit purposes without deleting it.
-- Cancelled entries stay in the table and are surfaced via a dedicated filter.
alter table public.debts drop constraint debts_status_check;
alter table public.debts add constraint debts_status_check check (status in ('pending', 'paid', 'cancelled'));
alter table public.debts add column if not exists cancelled_at timestamptz;
