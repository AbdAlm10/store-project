-- Optional. Read-only. Paste in the Supabase SQL editor to see stores
-- created before onboarding was finished. Does not update or delete anything.

select
  id,
  owner_id,
  name,
  slug,
  whatsapp,
  status,
  created_at
from public.stores
where btrim(coalesce(name, '')) = ''
   or btrim(coalesce(slug, '')) = ''
order by created_at;
