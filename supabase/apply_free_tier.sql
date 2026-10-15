-- Free vs Basic catalog, one free store per verified email and WhatsApp,
-- and a reversible 60-day inactivity freeze.
-- Idempotent. Does not recreate enums. Does not change Pro limits
-- (1,000 products, custom domain, advanced analytics).
--
-- Trial and paid Basic/Pro stay on those limits while the subscription is usable.
-- After the period ends the store stays public on Free limits. Extra products,
-- categories, images, and variants stay in the database and are hidden
-- (oldest first). They show again when the store is upgraded.
--
-- Paste in the Supabase SQL editor after apply_live.sql, apply_pricing.sql,
-- and apply_email_verify.sql.
--
-- Schedule the freeze once a day (مطلوب تدخل يدوي). Either:
--
-- 1) pg_cron, if the extension is enabled for the project:
--    create extension if not exists pg_cron;
--    select cron.schedule(
--      'freeze-inactive-free-stores',
--      '15 3 * * *',
--      $$select public.freeze_inactive_free_stores()$$
--    );
--
-- 2) A Netlify scheduled function (netlify/functions/freeze-free-stores.mts),
--    daily, calling the service-role RPC:
--    POST {SUPABASE_URL}/rest/v1/rpc/freeze_inactive_free_stores
--    headers: apikey + Authorization: Bearer {SUPABASE_SERVICE_ROLE_KEY}
--    The function refreshes free-store slots, then sets status = 'restricted'
--    on a published free store whose last activity is older than 60 days.
--    Data is kept. Set status back to 'published' to reverse it. A store with
--    a usable Basic or Pro subscription is never frozen by this job.

begin;

-- ---------------------------------------------------------------------------
-- Plan id. Existing rows stay trial/basic/pro.
-- ---------------------------------------------------------------------------

alter table public.subscriptions drop constraint if exists subscriptions_plan_id_check;
alter table public.subscriptions
  add constraint subscriptions_plan_id_check
  check (plan_id::text in ('free', 'trial', 'basic', 'pro'));

-- ---------------------------------------------------------------------------
-- One unpaid store per owner and per normalized WhatsApp.
-- ---------------------------------------------------------------------------

alter table public.stores
  add column if not exists free_slot boolean not null default false;

alter table public.stores
  add column if not exists whatsapp_normalized text;

update public.stores
set whatsapp_normalized = public.normalize_contact_phone(whatsapp)
where whatsapp is not null;

create or replace function public.store_effective_plan(target uuid)
returns text
language sql
stable
security definer
set search_path = public
as $fn$
  select case
    when not public.is_store_subscription_usable(target) then 'free'
    else coalesce(
      (select s.plan_id::text from public.subscriptions s where s.store_id = target),
      'free'
    )
  end;
$fn$;

create or replace function public.store_occupies_free_slot(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select not exists (
    select 1
    from public.subscriptions s
    where s.store_id = target
      and s.plan_id::text in ('basic', 'pro')
      and public.is_store_subscription_usable(s.store_id)
  );
$fn$;

revoke all on function public.store_effective_plan(uuid) from public;
revoke all on function public.store_occupies_free_slot(uuid) from public;
grant execute on function public.store_effective_plan(uuid) to anon, authenticated;
grant execute on function public.store_occupies_free_slot(uuid) to authenticated;

update public.stores set free_slot = false;

with ranked as (
  select
    s.id,
    row_number() over (
      partition by s.owner_id
      order by s.created_at asc, s.id asc
    ) as owner_rank
  from public.stores s
  where public.store_occupies_free_slot(s.id)
)
update public.stores s
set free_slot = true
from ranked r
where s.id = r.id
  and r.owner_rank = 1
  and not exists (
    select 1
    from public.stores other
    where other.free_slot
      and other.whatsapp_normalized is not null
      and other.whatsapp_normalized = s.whatsapp_normalized
      and other.id <> s.id
  );

create unique index if not exists stores_one_free_per_owner
  on public.stores (owner_id)
  where free_slot;

create unique index if not exists stores_one_free_per_whatsapp
  on public.stores (whatsapp_normalized)
  where free_slot and whatsapp_normalized is not null;

create or replace function public.guard_free_store_slot()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_email text;
begin
  new.whatsapp_normalized := public.normalize_contact_phone(new.whatsapp);
  if tg_op = 'INSERT' then
    new.free_slot := true;
  end if;
  if new.free_slot then
    if exists (
      select 1
      from public.stores s
      where s.owner_id = new.owner_id
        and s.free_slot
        and s.id is distinct from new.id
    ) then
      raise exception 'one free store per verified email' using errcode = '23505';
    end if;
    select lower(trim(p.email)) into v_email
    from public.profiles p
    where p.id = new.owner_id;
    if v_email is not null and exists (
      select 1
      from public.stores s
      join public.profiles op on op.id = s.owner_id
      where s.free_slot
        and s.id is distinct from new.id
        and lower(trim(op.email)) = v_email
    ) then
      raise exception 'one free store per verified email' using errcode = '23505';
    end if;
    if new.whatsapp_normalized is not null and exists (
      select 1
      from public.stores s
      where s.free_slot
        and s.whatsapp_normalized = new.whatsapp_normalized
        and s.id is distinct from new.id
    ) then
      raise exception 'one free store per whatsapp number' using errcode = '23505';
    end if;
  end if;
  return new;
end;
$fn$;

drop trigger if exists stores_guard_free_slot on public.stores;
create trigger stores_guard_free_slot
  before insert or update of whatsapp, free_slot, owner_id on public.stores
  for each row
  execute function public.guard_free_store_slot();

create or replace function public.refresh_free_store_slots()
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  r record;
begin
  update public.stores s
  set free_slot = false
  where s.free_slot
    and not public.store_occupies_free_slot(s.id);

  for r in
    select s.id
    from public.stores s
    where public.store_occupies_free_slot(s.id)
      and not s.free_slot
    order by s.created_at asc, s.id asc
  loop
    begin
      update public.stores set free_slot = true where id = r.id;
    exception
      when unique_violation then
        update public.stores
        set status = case
          when status::text = 'published' then 'restricted'
          else status
        end
        where id = r.id
          and free_slot = false;
    end;
  end loop;
end;
$fn$;

create or replace function public.sync_store_free_slot()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  perform public.refresh_free_store_slots();
  return null;
end;
$fn$;

drop trigger if exists subscriptions_sync_free_slot on public.subscriptions;
create trigger subscriptions_sync_free_slot
  after insert or update of plan_id, status, trial_ends_at, current_period_end
  on public.subscriptions
  for each row
  execute function public.sync_store_free_slot();

-- ---------------------------------------------------------------------------
-- Catalog caps. Free 10/3/1, Basic and trial 150/10/5, Pro 1000 / unlimited / 10.
-- Inserts over the cap are rejected. Existing rows are not deleted.
-- ---------------------------------------------------------------------------

create or replace function public.enforce_plan_catalog_limits()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_plan text;
  v_count integer;
  v_limit integer;
begin
  v_plan := public.store_effective_plan(new.store_id);

  if tg_table_name = 'products' then
    v_limit := case
      when v_plan = 'pro' then 1000
      when v_plan in ('basic', 'trial') then 150
      else 10
    end;
    select count(*) into v_count from public.products where store_id = new.store_id;
  elsif tg_table_name = 'categories' then
    if v_plan = 'pro' then
      return new;
    end if;
    v_limit := case when v_plan in ('basic', 'trial') then 10 else 3 end;
    select count(*) into v_count from public.categories where store_id = new.store_id;
  elsif tg_table_name = 'product_images' then
    v_limit := case
      when v_plan = 'pro' then 10
      when v_plan in ('basic', 'trial') then 5
      else 1
    end;
    select count(*) into v_count
    from public.product_images
    where product_id = new.product_id;
  elsif tg_table_name = 'product_variants' then
    if v_plan = 'free' then
      raise exception 'plan catalog limit reached' using errcode = '23514';
    end if;
    return new;
  else
    return new;
  end if;

  if v_count >= v_limit then
    raise exception 'plan catalog limit reached' using errcode = '23514';
  end if;
  return new;
end;
$fn$;

drop trigger if exists products_enforce_plan_limits on public.products;
create trigger products_enforce_plan_limits
  before insert on public.products
  for each row
  execute function public.enforce_plan_catalog_limits();

drop trigger if exists categories_enforce_plan_limits on public.categories;
create trigger categories_enforce_plan_limits
  before insert on public.categories
  for each row
  execute function public.enforce_plan_catalog_limits();

drop trigger if exists product_images_enforce_plan_limits on public.product_images;
create trigger product_images_enforce_plan_limits
  before insert on public.product_images
  for each row
  execute function public.enforce_plan_catalog_limits();

drop trigger if exists product_variants_enforce_plan_limits on public.product_variants;
create trigger product_variants_enforce_plan_limits
  before insert on public.product_variants
  for each row
  execute function public.enforce_plan_catalog_limits();

-- ---------------------------------------------------------------------------
-- Public reads: a published store stays visible after the trial.
-- Free visitors see the oldest 10 products, 3 categories, and 1 image.
-- Variants stay hidden until the plan includes them. Members see everything.
-- ---------------------------------------------------------------------------

create or replace function public.product_visible_to_public(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select exists (
    select 1
    from public.products p
    join public.stores s on s.id = p.store_id
    where p.id = target
      and p.status::text = 'published'
      and s.status::text = 'published'
      and s.suspended_at is null
      and (
        public.store_effective_plan(s.id) <> 'free'
        or (
          select count(*)
          from public.products older
          where older.store_id = p.store_id
            and older.status::text = 'published'
            and (older.created_at, older.id) <= (p.created_at, p.id)
        ) <= 10
      )
  );
$fn$;

create or replace function public.category_visible_to_public(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select exists (
    select 1
    from public.categories c
    join public.stores s on s.id = c.store_id
    where c.id = target
      and s.status::text = 'published'
      and s.suspended_at is null
      and (
        public.store_effective_plan(s.id) <> 'free'
        or (
          select count(*)
          from public.categories older
          where older.store_id = c.store_id
            and (older.created_at, older.id) <= (c.created_at, c.id)
        ) <= 3
      )
  );
$fn$;

revoke all on function public.product_visible_to_public(uuid) from public;
revoke all on function public.category_visible_to_public(uuid) from public;
grant execute on function public.product_visible_to_public(uuid) to anon, authenticated;
grant execute on function public.category_visible_to_public(uuid) to anon, authenticated;

drop policy if exists stores_select on public.stores;
create policy stores_select
  on public.stores for select to anon, authenticated
  using (
    (status::text = 'published' and suspended_at is null)
    or owner_id = auth.uid()
    or public.is_store_member(id)
  );

drop policy if exists categories_select on public.categories;
create policy categories_select
  on public.categories for select to anon, authenticated
  using (
    public.is_store_member(store_id)
    or public.category_visible_to_public(id)
  );

drop policy if exists products_select on public.products;
create policy products_select
  on public.products for select to anon, authenticated
  using (
    public.is_store_member(store_id)
    or public.product_visible_to_public(id)
  );

-- Reading product_images from its own SELECT policy is infinite recursion:
-- member inserts that return the new row, and storefront reads, both fail.
-- The definer runs as the table owner, so this lookup does not re-enter the policy.
create or replace function public.primary_product_image_id(p_product_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $fn$
  select img.id
  from public.product_images img
  where img.product_id = p_product_id
  order by img.sort_order asc, img.id asc
  limit 1;
$fn$;

revoke all on function public.primary_product_image_id(uuid) from public;
grant execute on function public.primary_product_image_id(uuid) to anon, authenticated;

drop policy if exists product_images_select on public.product_images;
create policy product_images_select
  on public.product_images for select to anon, authenticated
  using (
    public.is_store_member(store_id)
    or (
      public.product_visible_to_public(product_id)
      and (
        public.store_effective_plan(store_id) <> 'free'
        or id = public.primary_product_image_id(product_id)
      )
    )
  );

drop policy if exists product_variants_select on public.product_variants;
create policy product_variants_select
  on public.product_variants for select to anon, authenticated
  using (
    public.is_store_member(store_id)
    or (
      public.store_effective_plan(store_id) <> 'free'
      and public.product_visible_to_public(product_id)
    )
  );

create or replace function public.store_media_publicly_visible(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $fn$
declare
  v_store uuid;
begin
  if split_part(object_name, '/', 1) <> 'stores' then
    return false;
  end if;
  begin
    v_store := split_part(object_name, '/', 2)::uuid;
  exception
    when others then
      return false;
  end;
  if public.is_store_member(v_store) then
    return true;
  end if;
  return exists (
    select 1
    from public.stores s
    where s.id = v_store
      and s.status::text = 'published'
      and s.suspended_at is null
  );
end;
$fn$;

-- ---------------------------------------------------------------------------
-- 60 days without activity freezes a free store. Reversible: set status
-- back to published. A usable Basic or Pro subscription is skipped.
-- ---------------------------------------------------------------------------

create or replace function public.store_last_activity(target uuid)
returns timestamptz
language sql
stable
security definer
set search_path = public
as $fn$
  select greatest(
    s.created_at,
    s.updated_at,
    coalesce((select max(e.created_at) from public.analytics_events e where e.store_id = s.id), s.created_at),
    coalesce((select max(p.updated_at) from public.products p where p.store_id = s.id), s.created_at)
  )
  from public.stores s
  where s.id = target;
$fn$;

create or replace function public.freeze_inactive_free_stores()
returns integer
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_count integer := 0;
begin
  perform public.refresh_free_store_slots();

  update public.stores s
  set status = 'restricted',
      updated_at = now()
  where s.status::text = 'published'
    and s.suspended_at is null
    and public.store_effective_plan(s.id) = 'free'
    and public.store_last_activity(s.id) < now() - interval '60 days';

  get diagnostics v_count = row_count;
  return v_count;
end;
$fn$;

revoke all on function public.freeze_inactive_free_stores() from public;
revoke all on function public.refresh_free_store_slots() from public;
grant execute on function public.freeze_inactive_free_stores() to service_role;
grant execute on function public.refresh_free_store_slots() to service_role;

commit;
