-- Departments move from the user-editable 'lists' row into their own
-- settings row so RLS can lock writes to admins only, while recipients/
-- authorizers stay freely extendable by any authenticated user.
insert into public.settings (key, value)
select 'departments', coalesce(value->'departments', '[]'::jsonb)
from public.settings where key = 'lists'
on conflict (key) do nothing;

update public.settings set value = value - 'departments' where key = 'lists';

create policy "settings_update_departments_admin" on public.settings
  for update using (key = 'departments' and public.is_admin())
  with check (key = 'departments');
