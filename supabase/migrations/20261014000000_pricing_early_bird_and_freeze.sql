
-- Pricing, first-100 early bird, catalog limits, and frozen storefronts.
-- Same body as supabase/apply_pricing.sql (that file wraps this in begin/commit).
-- Does not recreate membership_role or other enums.
-- Limits must match src/config/plans.ts: trial/basic 150 products and 10 categories;
-- pro 1000 products and unlimited categories. Early bird is 25% off the first
-- paid year for the first 100 merchants.

-- ---------------------------------------------------------------------------
-- Early-bird counter. Merchants cannot insert or update these tables.
-- claim_early_bird_slot is SECURITY DEFINER and locks the counter row.
-- Admin activation writes the charged amount with the service role.
-- ---------------------------------------------------------------------------

create table if not exists public.early_bird_slots (
  id integer primary key,
  next_slot integer not null
);

alter table public.early_bird_slots drop constraint if exists early_bird_slots_id_check;
alter table public.early_bird_slots
  add constraint early_bird_slots_id_check check (id = 1);

alter table public.early_bird_slots drop constraint if exists early_bird_slots_next_slot_check;
alter table public.early_bird_slots
  add constraint early_bird_slots_next_slot_check check (next_slot >= 1);

insert into public.early_bird_slots (id, next_slot)
values (1, 1)
on conflict (id) do nothing;

create table if not exists public.early_bird_grants (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  store_id uuid not null unique references public.stores (id) on delete cascade,
  slot_number integer not null unique,
  claimed_at timestamptz not null default now(),
  applied_at timestamptz,
  discount_until timestamptz,
  plan_id text,
  billing_period text,
  charged_amount_usd numeric(12, 2)
);

alter table public.early_bird_grants drop constraint if exists early_bird_grants_slot_check;
alter table public.early_bird_grants
  add constraint early_bird_grants_slot_check check (slot_number between 1 and 100);

alter table public.early_bird_grants drop constraint if exists early_bird_grants_plan_check;
alter table public.early_bird_grants
  add constraint early_bird_grants_plan_check
  check (plan_id is null or plan_id in ('basic', 'pro'));

alter table public.early_bird_grants drop constraint if exists early_bird_grants_period_check;
alter table public.early_bird_grants
  add constraint early_bird_grants_period_check
  check (billing_period is null or billing_period in ('monthly', 'yearly'));

alter table public.early_bird_slots enable row level security;
alter table public.early_bird_grants enable row level security;

revoke all on table public.early_bird_slots from public, anon, authenticated;
revoke all on table public.early_bird_grants from public, anon, authenticated;
grant select on table public.early_bird_grants to authenticated;

drop policy if exists early_bird_grants_select_own on public.early_bird_grants;
create policy early_bird_grants_select_own
  on public.early_bird_grants
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_store_member(store_id)
  );

create or replace function public.claim_early_bird_slot(target_store_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_uid uuid := auth.uid();
  v_existing public.early_bird_grants%rowtype;
  v_next integer;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.stores s
    where s.id = target_store_id
      and (
        s.owner_id = v_uid
        or public.is_store_member(s.id)
      )
  ) then
    raise exception 'not a store member' using errcode = '42501';
  end if;

  -- Lock the single counter row before deciding, so two claims cannot take one slot.
  select next_slot
    into v_next
  from public.early_bird_slots
  where id = 1
  for update;

  if v_next is null then
    insert into public.early_bird_slots (id, next_slot)
    values (1, 1)
    on conflict (id) do nothing;
    select next_slot
      into v_next
    from public.early_bird_slots
    where id = 1
    for update;
  end if;

  select *
    into v_existing
  from public.early_bird_grants
  where user_id = v_uid;

  if found then
    return jsonb_build_object(
      'eligible', true,
      'slot_number', v_existing.slot_number,
      'already_claimed', true
    );
  end if;

  select *
    into v_existing
  from public.early_bird_grants
  where store_id = target_store_id;

  if found then
    return jsonb_build_object(
      'eligible', false,
      'slot_number', null,
      'already_claimed', false
    );
  end if;

  if v_next > 100 then
    return jsonb_build_object(
      'eligible', false,
      'slot_number', null,
      'already_claimed', false
    );
  end if;

  insert into public.early_bird_grants (user_id, store_id, slot_number)
  values (v_uid, target_store_id, v_next);

  update public.early_bird_slots
    set next_slot = v_next + 1
  where id = 1;

  return jsonb_build_object(
    'eligible', true,
    'slot_number', v_next,
    'already_claimed', false
  );
exception
  when unique_violation then
    select *
      into v_existing
    from public.early_bird_grants
    where user_id = v_uid;
    if found then
      return jsonb_build_object(
        'eligible', true,
        'slot_number', v_existing.slot_number,
        'already_claimed', true
      );
    end if;
    return jsonb_build_object(
      'eligible', false,
      'slot_number', null,
      'already_claimed', false
    );
end;
$fn$;

revoke all on function public.claim_early_bird_slot(uuid) from public, anon;
grant execute on function public.claim_early_bird_slot(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Catalog caps. SECURITY DEFINER so the count is not filtered by RLS.
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
  select s.plan_id
    into v_plan
  from public.subscriptions s
  where s.store_id = new.store_id;

  if tg_table_name = 'products' then
    v_limit := case when v_plan = 'pro' then 1000 else 150 end;
    select count(*) into v_count from public.products where store_id = new.store_id;
  elsif tg_table_name = 'categories' then
    if v_plan = 'pro' then
      return new;
    end if;
    v_limit := 10;
    select count(*) into v_count from public.categories where store_id = new.store_id;
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

-- ---------------------------------------------------------------------------
-- Frozen stores are hidden from customers. Members and owners still read.
-- A published store with an unusable subscription is hidden too.
-- ---------------------------------------------------------------------------

drop policy if exists stores_select on public.stores;
create policy stores_select
  on public.stores for select to anon, authenticated
  using (
    (
      status::text = 'published'
      and public.is_store_subscription_usable(id)
    )
    or owner_id = auth.uid()
    or public.is_store_member(id)
  );

drop policy if exists categories_select on public.categories;
create policy categories_select
  on public.categories for select to anon, authenticated
  using (
    public.is_store_member(store_id)
    or exists (
      select 1
      from public.stores s
      where s.id = store_id
        and s.status::text = 'published'
        and public.is_store_subscription_usable(s.id)
    )
  );

drop policy if exists products_select on public.products;
create policy products_select
  on public.products for select to anon, authenticated
  using (
    public.is_store_member(store_id)
    or (
      status::text = 'published'
      and exists (
        select 1
        from public.stores s
        where s.id = store_id
          and s.status::text = 'published'
          and public.is_store_subscription_usable(s.id)
      )
    )
  );

drop policy if exists product_images_select on public.product_images;
create policy product_images_select
  on public.product_images for select to anon, authenticated
  using (
    public.is_store_member(store_id)
    or exists (
      select 1
      from public.products p
      join public.stores s on s.id = p.store_id
      where p.id = product_id
        and p.store_id = product_images.store_id
        and p.status::text = 'published'
        and s.status::text = 'published'
        and public.is_store_subscription_usable(s.id)
    )
  );

drop policy if exists product_variants_select on public.product_variants;
create policy product_variants_select
  on public.product_variants for select to anon, authenticated
  using (
    public.is_store_member(store_id)
    or exists (
      select 1
      from public.products p
      join public.stores s on s.id = p.store_id
      where p.id = product_id
        and p.store_id = product_variants.store_id
        and p.status::text = 'published'
        and s.status::text = 'published'
        and public.is_store_subscription_usable(s.id)
    )
  );

drop policy if exists subscriptions_select_public on public.subscriptions;
create policy subscriptions_select_public
  on public.subscriptions for select to anon
  using (
    exists (
      select 1
      from public.stores s
      where s.id = store_id
        and s.status::text = 'published'
        and public.is_store_subscription_usable(s.id)
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
      and public.is_store_subscription_usable(s.id)
  );
end;
$fn$;

revoke all on function public.store_media_publicly_visible(text) from public;
grant execute on function public.store_media_publicly_visible(text) to anon, authenticated;

do $fn$
begin
  if to_regclass('storage.objects') is null then
    return;
  end if;
  execute 'drop policy if exists store_media_public_read on storage.objects';
  execute 'create policy store_media_public_read on storage.objects for select to anon, authenticated using (bucket_id = ''store-media'' and public.store_media_publicly_visible(name))';
end
$fn$;

