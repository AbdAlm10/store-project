-- One row per merchant save attempt. A retried "save and publish" returns the
-- same product instead of inserting a duplicate. Safe to run more than once.

alter table public.products
  add column if not exists client_request_id text;

create unique index if not exists products_store_client_request_id_key
  on public.products (store_id, client_request_id)
  where client_request_id is not null;
