-- Schema and row level security inferred from the application model.
-- Paste supabase/apply_all.sql once in the Supabase SQL editor, or apply
-- every file in supabase/migrations in timestamp order with `supabase db push`.
-- Deploying the Next.js app does not execute this SQL.
-- Function bodies use a named dollar tag so the SQL editor keeps them in one piece.

-- pgcrypto belongs in schema extensions (extensions.gen_random_bytes).
-- A stopped earlier paste may have created it in public; move it.
create schema if not exists extensions;

do $fn$
begin
  if not exists (select 1 from pg_extension where extname = 'pgcrypto') then
    execute 'create extension pgcrypto with schema extensions';
  elsif not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where p.proname = 'gen_random_bytes'
      and n.nspname = 'extensions'
  ) then
    execute 'alter extension pgcrypto set schema extensions';
  end if;
end
$fn$;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Older databases named these arguments differently (target_store, min_role,
-- store_role). CREATE OR REPLACE cannot rename an argument, and the app calls
-- target_store_id by name. Drop every overload, then create the names above.
-- CASCADE removes policies and triggers that call the function. This file
-- recreates them. Rows in tables are not deleted.
do $fn$
declare
  sig text;
begin
  for sig in
    select format(
      '%I.%I(%s)',
      n.nspname,
      p.proname,
      pg_get_function_identity_arguments(p.oid)
    )
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'set_updated_at',
        'store_role_rank',
        'protect_profile_privileges',
        'protect_store_owner',
        'is_store_member',
        'has_store_role',
        'is_store_subscription_usable'
      )
  loop
    execute 'drop function if exists ' || sig || ' cascade';
  end loop;
end
$fn$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $fn$
begin
  new.updated_at = now();
  return new;
end;
$fn$;

create or replace function public.store_role_rank(role text)
returns integer
language sql
immutable
as $fn$
  select case role
    when 'staff' then 1
    when 'manager' then 2
    when 'owner' then 3
    else 0
  end;
$fn$;

-- Live databases may store store_members.role as an enum (membership_role
-- or another name). text does not match that call. Add an overload for each
-- existing enum, and for a type named membership_role wherever it lives.
do $fn$
declare
  rec record;
begin
  for rec in
    select distinct n.nspname as type_schema, t.typname as type_name
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typtype = 'e'
      and n.nspname not in ('pg_catalog', 'information_schema')
      and (
        t.typname = 'membership_role'
        or exists (
          select 1
          from pg_attribute a
          join pg_class c on c.oid = a.attrelid
          join pg_namespace cn on cn.oid = c.relnamespace
          where cn.nspname = 'public'
            and c.relname = 'store_members'
            and a.attname = 'role'
            and not a.attisdropped
            and a.atttypid = t.oid
        )
      )
  loop
    execute format(
      'create or replace function public.store_role_rank(role %I.%I) returns integer language sql immutable as %L',
      rec.type_schema,
      rec.type_name,
      'select public.store_role_rank(role::text)'
    );
    execute format(
      'grant execute on function public.store_role_rank(%I.%I) to anon, authenticated',
      rec.type_schema,
      rec.type_name
    );
  end loop;
end
$fn$;

create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  jwt_role text;
begin
  jwt_role := coalesce(auth.jwt() ->> 'role', '');
  if jwt_role = 'service_role' or session_user in ('postgres', 'supabase_admin') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.id is distinct from auth.uid() then
      raise exception 'profile id must match the signed-in user';
    end if;
    new.platform_role := 'merchant';
    new.suspended_at := null;
    return new;
  end if;
  new.platform_role := old.platform_role;
  new.suspended_at := old.suspended_at;
  return new;
end;
$fn$;

create or replace function public.protect_store_owner()
returns trigger
language plpgsql
set search_path = public
as $fn$
begin
  if new.owner_id is distinct from old.owner_id
     and coalesce(auth.jwt() ->> 'role', '') <> 'service_role'
     and session_user not in ('postgres', 'supabase_admin') then
    raise exception 'owner_id cannot be changed';
  end if;
  return new;
end;
$fn$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  platform_role text not null default 'merchant',
  locale text not null default 'ar',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  suspended_at timestamptz
);

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists platform_role text not null default 'merchant';
alter table public.profiles add column if not exists locale text not null default 'ar';
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();
alter table public.profiles add column if not exists suspended_at timestamptz;

alter table public.profiles drop constraint if exists profiles_platform_role_check;
alter table public.profiles
  add constraint profiles_platform_role_check
  check (platform_role::text in ('visitor', 'merchant', 'admin'));

create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  logo_url text,
  cover_url text,
  status text not null default 'draft',
  currency text not null default 'USD',
  phone text,
  whatsapp text,
  email text,
  location text,
  opening_hours text,
  instagram text,
  facebook text,
  telegram text,
  tiktok text,
  primary_color text not null default '#58A379',
  theme_id text not null default 'clean',
  theme_overrides jsonb not null default '{}'::jsonb,
  default_locale text not null default 'ar',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  suspended_at timestamptz
);

alter table public.stores add column if not exists owner_id uuid;
alter table public.stores add column if not exists name text;
alter table public.stores add column if not exists slug text;
alter table public.stores add column if not exists description text;
alter table public.stores add column if not exists logo_url text;
alter table public.stores add column if not exists cover_url text;
alter table public.stores add column if not exists status text not null default 'draft';
alter table public.stores add column if not exists currency text not null default 'USD';
alter table public.stores add column if not exists phone text;
alter table public.stores add column if not exists whatsapp text;
alter table public.stores add column if not exists email text;
alter table public.stores add column if not exists location text;
alter table public.stores add column if not exists opening_hours text;
alter table public.stores add column if not exists instagram text;
alter table public.stores add column if not exists facebook text;
alter table public.stores add column if not exists telegram text;
alter table public.stores add column if not exists tiktok text;
alter table public.stores add column if not exists primary_color text not null default '#58A379';
alter table public.stores add column if not exists theme_id text not null default 'clean';
alter table public.stores add column if not exists theme_overrides jsonb not null default '{}'::jsonb;
alter table public.stores add column if not exists default_locale text not null default 'ar';
alter table public.stores add column if not exists created_at timestamptz not null default now();
alter table public.stores add column if not exists updated_at timestamptz not null default now();
alter table public.stores add column if not exists published_at timestamptz;
alter table public.stores add column if not exists suspended_at timestamptz;

alter table public.stores drop constraint if exists stores_status_check;
alter table public.stores
  add constraint stores_status_check
  check (status::text in ('draft', 'published', 'suspended', 'restricted'));

alter table public.stores drop constraint if exists stores_currency_check;
alter table public.stores
  add constraint stores_currency_check
  check (currency::text in ('USD', 'EUR', 'SYP', 'TRY'));

alter table public.stores drop constraint if exists stores_theme_id_check;
alter table public.stores
  add constraint stores_theme_id_check
  check (theme_id::text in ('clean', 'bold', 'warm', 'minimal', 'classic', 'ocean', 'night', 'rose'));

alter table public.stores drop constraint if exists stores_theme_overrides_object_check;
alter table public.stores
  add constraint stores_theme_overrides_object_check
  check (jsonb_typeof(theme_overrides) = 'object');

create unique index if not exists stores_slug_key on public.stores (slug);

create table if not exists public.store_members (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null,
  created_at timestamptz not null default now(),
  unique (store_id, user_id)
);

alter table public.store_members add column if not exists store_id uuid;
alter table public.store_members add column if not exists user_id uuid;
alter table public.store_members add column if not exists role text;
alter table public.store_members add column if not exists created_at timestamptz not null default now();

alter table public.store_members drop constraint if exists store_members_role_check;
alter table public.store_members
  add constraint store_members_role_check
  check (role::text in ('owner', 'manager', 'staff'));

create unique index if not exists store_members_store_user_key
  on public.store_members (store_id, user_id);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  name text not null,
  slug text not null,
  sort_order integer not null default 0,
  image_url text,
  icon text,
  option_schema jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, slug)
);

alter table public.categories add column if not exists store_id uuid;
alter table public.categories add column if not exists name text;
alter table public.categories add column if not exists slug text;
alter table public.categories add column if not exists sort_order integer not null default 0;
alter table public.categories add column if not exists image_url text;
alter table public.categories add column if not exists icon text;
alter table public.categories add column if not exists option_schema jsonb not null default '[]'::jsonb;
alter table public.categories add column if not exists created_at timestamptz not null default now();
alter table public.categories add column if not exists updated_at timestamptz not null default now();

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  name text not null,
  slug text not null,
  description text,
  price numeric not null default 0,
  compare_at_price numeric,
  currency text not null default 'USD',
  stock integer,
  status text not null default 'draft',
  tags text[] not null default '{}',
  specifications jsonb not null default '{}'::jsonb,
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  unique (store_id, slug)
);

alter table public.products add column if not exists store_id uuid;
alter table public.products add column if not exists category_id uuid;
alter table public.products add column if not exists name text;
alter table public.products add column if not exists slug text;
alter table public.products add column if not exists description text;
alter table public.products add column if not exists price numeric not null default 0;
alter table public.products add column if not exists compare_at_price numeric;
alter table public.products add column if not exists currency text not null default 'USD';
alter table public.products add column if not exists stock integer;
alter table public.products add column if not exists status text not null default 'draft';
alter table public.products add column if not exists tags text[] not null default '{}';
alter table public.products add column if not exists specifications jsonb not null default '{}'::jsonb;
alter table public.products add column if not exists featured boolean not null default false;
alter table public.products add column if not exists created_at timestamptz not null default now();
alter table public.products add column if not exists updated_at timestamptz not null default now();
alter table public.products add column if not exists published_at timestamptz;

alter table public.products drop constraint if exists products_status_check;
alter table public.products
  add constraint products_status_check
  check (status::text in ('draft', 'published', 'archived', 'hidden'));

alter table public.products drop constraint if exists products_currency_check;
alter table public.products
  add constraint products_currency_check
  check (currency::text in ('USD', 'EUR', 'SYP', 'TRY'));

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  store_id uuid not null references public.stores (id) on delete cascade,
  url text not null,
  alt text,
  sort_order integer not null default 0,
  width integer,
  height integer
);

alter table public.product_images add column if not exists product_id uuid;
alter table public.product_images add column if not exists store_id uuid;
alter table public.product_images add column if not exists url text;
alter table public.product_images add column if not exists alt text;
alter table public.product_images add column if not exists sort_order integer not null default 0;
alter table public.product_images add column if not exists width integer;
alter table public.product_images add column if not exists height integer;

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  store_id uuid not null references public.stores (id) on delete cascade,
  name text not null,
  options jsonb not null default '{}'::jsonb,
  price numeric,
  stock integer,
  sku text
);

alter table public.product_variants add column if not exists product_id uuid;
alter table public.product_variants add column if not exists store_id uuid;
alter table public.product_variants add column if not exists name text;
alter table public.product_variants add column if not exists options jsonb not null default '{}'::jsonb;
alter table public.product_variants add column if not exists price numeric;
alter table public.product_variants add column if not exists stock integer;
alter table public.product_variants add column if not exists sku text;

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null unique references public.stores (id) on delete cascade,
  plan_id text not null default 'trial',
  billing_period text not null default 'monthly',
  status text not null default 'trialing',
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions add column if not exists store_id uuid;
alter table public.subscriptions add column if not exists plan_id text not null default 'trial';
alter table public.subscriptions add column if not exists billing_period text not null default 'monthly';
alter table public.subscriptions add column if not exists status text not null default 'trialing';
alter table public.subscriptions add column if not exists trial_ends_at timestamptz;
alter table public.subscriptions add column if not exists current_period_end timestamptz;
alter table public.subscriptions add column if not exists stripe_customer_id text;
alter table public.subscriptions add column if not exists stripe_subscription_id text;
alter table public.subscriptions add column if not exists created_at timestamptz not null default now();
alter table public.subscriptions add column if not exists updated_at timestamptz not null default now();

alter table public.subscriptions drop constraint if exists subscriptions_plan_id_check;
alter table public.subscriptions
  add constraint subscriptions_plan_id_check
  check (plan_id::text in ('trial', 'basic', 'pro'));

alter table public.subscriptions drop constraint if exists subscriptions_status_check;
alter table public.subscriptions
  add constraint subscriptions_status_check
  check (status::text in ('trialing', 'active', 'past_due', 'canceled', 'expired', 'restricted'));

create unique index if not exists subscriptions_store_id_key on public.subscriptions (store_id);

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  event_type text not null,
  source text,
  path text,
  visitor_key text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.analytics_events add column if not exists store_id uuid;
alter table public.analytics_events add column if not exists product_id uuid;
alter table public.analytics_events add column if not exists event_type text;
alter table public.analytics_events add column if not exists source text;
alter table public.analytics_events add column if not exists path text;
alter table public.analytics_events add column if not exists visitor_key text;
alter table public.analytics_events add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.analytics_events add column if not exists created_at timestamptz not null default now();

alter table public.analytics_events drop constraint if exists analytics_events_type_check;
alter table public.analytics_events
  add constraint analytics_events_type_check
  check (event_type::text in (
    'store_view', 'product_view', 'whatsapp_click', 'share', 'search', 'qr_scan'
  ));

alter table public.analytics_events drop constraint if exists analytics_events_path_len_check;
alter table public.analytics_events
  add constraint analytics_events_path_len_check
  check (path is null or char_length(path) <= 500);

alter table public.analytics_events drop constraint if exists analytics_events_visitor_len_check;
alter table public.analytics_events
  add constraint analytics_events_visitor_len_check
  check (visitor_key is null or char_length(visitor_key) <= 80);

alter table public.analytics_events drop constraint if exists analytics_events_metadata_size_check;
alter table public.analytics_events
  add constraint analytics_events_metadata_size_check
  check (octet_length(metadata::text) <= 8000);

drop index if exists public.analytics_events_store_created_idx;
create index analytics_events_store_created_idx
  on public.analytics_events (store_id, created_at desc);
drop index if exists public.products_store_status_idx;
create index products_store_status_idx
  on public.products (store_id, status);
drop index if exists public.categories_store_idx;
create index categories_store_idx
  on public.categories (store_id, sort_order);

create unique index if not exists categories_store_id_slug_key
  on public.categories (store_id, slug);
create unique index if not exists products_store_id_slug_key
  on public.products (store_id, slug);

-- Helpers that read tables. Created after the tables so a fresh database
-- accepts the function bodies.
create or replace function public.is_store_member(target_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select exists (
    select 1
    from public.store_members m
    where m.store_id = target_store_id
      and m.user_id = auth.uid()
  );
$fn$;

create or replace function public.has_store_role(target_store_id uuid, minimum_role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select exists (
    select 1
    from public.store_members m
    where m.store_id = target_store_id
      and m.user_id = auth.uid()
      and public.store_role_rank(m.role::text) >= public.store_role_rank(minimum_role::text)
  );
$fn$;

-- Boolean only. Missing row stays usable so a store without a subscription
-- row is not locked. Does not return plan or billing columns.
create or replace function public.is_store_subscription_usable(target_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select coalesce(
    (
      select
        s.status::text in ('trialing', 'active', 'past_due')
        and (
          s.status::text <> 'trialing'
          or s.trial_ends_at is null
          or s.trial_ends_at >= now()
        )
        and (
          s.status::text = 'trialing'
          or s.current_period_end is null
          or s.current_period_end >= now()
        )
      from public.subscriptions s
      where s.store_id = target_store_id
    ),
    true
  );
$fn$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists profiles_protect_privileges on public.profiles;
create trigger profiles_protect_privileges
  before insert or update on public.profiles
  for each row execute function public.protect_profile_privileges();

drop trigger if exists stores_set_updated_at on public.stores;
create trigger stores_set_updated_at
  before update on public.stores
  for each row execute function public.set_updated_at();

drop trigger if exists stores_protect_owner on public.stores;
create trigger stores_protect_owner
  before update on public.stores
  for each row execute function public.protect_store_owner();

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------

revoke all on public.profiles from anon, authenticated;
revoke all on public.stores from anon, authenticated;
revoke all on public.store_members from anon, authenticated;
revoke all on public.categories from anon, authenticated;
revoke all on public.products from anon, authenticated;
revoke all on public.product_images from anon, authenticated;
revoke all on public.product_variants from anon, authenticated;
revoke all on public.subscriptions from anon, authenticated;
revoke all on public.analytics_events from anon, authenticated;

grant select, insert, update on public.profiles to authenticated;
revoke update (platform_role, suspended_at) on public.profiles from authenticated, anon;

grant select on public.stores to anon, authenticated;
grant insert, update on public.stores to authenticated;

grant select, insert, update, delete on public.store_members to authenticated;

grant select on public.categories to anon, authenticated;
grant insert, update, delete on public.categories to authenticated;

grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;

grant select on public.product_images to anon, authenticated;
grant insert, update, delete on public.product_images to authenticated;

grant select on public.product_variants to anon, authenticated;
grant insert, update, delete on public.product_variants to authenticated;

grant select (
  id, store_id, plan_id, billing_period, status,
  trial_ends_at, current_period_end, created_at, updated_at
) on public.subscriptions to anon;
grant select, insert, update on public.subscriptions to authenticated;

grant insert on public.analytics_events to anon, authenticated;
grant select on public.analytics_events to authenticated;

grant execute on function public.is_store_member(uuid) to anon, authenticated;
grant execute on function public.has_store_role(uuid, text) to anon, authenticated;
grant execute on function public.is_store_subscription_usable(uuid) to anon, authenticated;
grant execute on function public.store_role_rank(text) to anon, authenticated;

do $fn$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant all privileges on all tables in schema public to service_role;
    grant execute on all functions in schema public to service_role;
  end if;
end $fn$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.stores enable row level security;
alter table public.store_members enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;
alter table public.subscriptions enable row level security;
alter table public.analytics_events enable row level security;

-- Remove policies left by an older script, including names this file does
-- not use. The statements below create the policies the app expects.
do $fn$
declare
  policy_name text;
  target_table text;
begin
  foreach target_table in array array[
    'profiles', 'stores', 'store_members', 'categories', 'products',
    'product_images', 'product_variants', 'subscriptions', 'analytics_events'
  ]
  loop
    for policy_name in
      select pol.policyname
      from pg_policies pol
      where pol.schemaname = 'public'
        and pol.tablename = target_table
    loop
      execute format('drop policy if exists %I on public.%I', policy_name, target_table);
    end loop;
  end loop;
end
$fn$;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
  on public.profiles for select to authenticated
  using (id = auth.uid());

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
  on public.profiles for insert to authenticated
  with check (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists stores_select on public.stores;
create policy stores_select
  on public.stores for select to anon, authenticated
  using (
    status::text in ('published', 'restricted')
    or owner_id = auth.uid()
    or public.is_store_member(id)
  );

drop policy if exists stores_insert_own on public.stores;
create policy stores_insert_own
  on public.stores for insert to authenticated
  with check (owner_id = auth.uid());

drop policy if exists stores_update_manager on public.stores;
create policy stores_update_manager
  on public.stores for update to authenticated
  using (public.has_store_role(id, 'manager') or owner_id = auth.uid())
  with check (public.has_store_role(id, 'manager') or owner_id = auth.uid());

drop policy if exists store_members_select on public.store_members;
create policy store_members_select
  on public.store_members for select to authenticated
  using (user_id = auth.uid() or public.is_store_member(store_id));

drop policy if exists store_members_insert on public.store_members;
create policy store_members_insert
  on public.store_members for insert to authenticated
  with check (
    (
      user_id = auth.uid()
      and role = 'owner'
      and exists (
        select 1 from public.stores s
        where s.id = store_id and s.owner_id = auth.uid()
      )
    )
    or public.has_store_role(store_id, 'owner')
  );

drop policy if exists store_members_update_owner on public.store_members;
create policy store_members_update_owner
  on public.store_members for update to authenticated
  using (public.has_store_role(store_id, 'owner'))
  with check (public.has_store_role(store_id, 'owner'));

drop policy if exists store_members_delete_owner on public.store_members;
create policy store_members_delete_owner
  on public.store_members for delete to authenticated
  using (public.has_store_role(store_id, 'owner'));

drop policy if exists categories_select on public.categories;
create policy categories_select
  on public.categories for select to anon, authenticated
  using (
    public.is_store_member(store_id)
    or exists (
      select 1 from public.stores s
      where s.id = store_id and s.status::text in ('published', 'restricted')
    )
  );

drop policy if exists categories_write on public.categories;
create policy categories_write
  on public.categories for insert to authenticated
  with check (public.is_store_member(store_id));

drop policy if exists categories_update on public.categories;
create policy categories_update
  on public.categories for update to authenticated
  using (public.is_store_member(store_id))
  with check (public.is_store_member(store_id));

drop policy if exists categories_delete on public.categories;
create policy categories_delete
  on public.categories for delete to authenticated
  using (public.is_store_member(store_id));

drop policy if exists products_select on public.products;
create policy products_select
  on public.products for select to anon, authenticated
  using (
    public.is_store_member(store_id)
    or (
      status = 'published'
      and exists (
        select 1 from public.stores s
        where s.id = store_id and s.status::text in ('published', 'restricted')
      )
    )
  );

drop policy if exists products_insert on public.products;
create policy products_insert
  on public.products for insert to authenticated
  with check (public.is_store_member(store_id));

drop policy if exists products_update on public.products;
create policy products_update
  on public.products for update to authenticated
  using (public.is_store_member(store_id))
  with check (public.is_store_member(store_id));

drop policy if exists products_delete on public.products;
create policy products_delete
  on public.products for delete to authenticated
  using (public.is_store_member(store_id));

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
        and p.status = 'published'
        and s.status::text in ('published', 'restricted')
    )
  );

drop policy if exists product_images_write on public.product_images;
create policy product_images_write
  on public.product_images for insert to authenticated
  with check (public.is_store_member(store_id));

drop policy if exists product_images_update on public.product_images;
create policy product_images_update
  on public.product_images for update to authenticated
  using (public.is_store_member(store_id))
  with check (public.is_store_member(store_id));

drop policy if exists product_images_delete on public.product_images;
create policy product_images_delete
  on public.product_images for delete to authenticated
  using (public.is_store_member(store_id));

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
        and p.status = 'published'
        and s.status::text in ('published', 'restricted')
    )
  );

drop policy if exists product_variants_write on public.product_variants;
create policy product_variants_write
  on public.product_variants for insert to authenticated
  with check (public.is_store_member(store_id));

drop policy if exists product_variants_update on public.product_variants;
create policy product_variants_update
  on public.product_variants for update to authenticated
  using (public.is_store_member(store_id))
  with check (public.is_store_member(store_id));

drop policy if exists product_variants_delete on public.product_variants;
create policy product_variants_delete
  on public.product_variants for delete to authenticated
  using (public.is_store_member(store_id));

drop policy if exists subscriptions_select_public on public.subscriptions;
create policy subscriptions_select_public
  on public.subscriptions for select to anon
  using (
    exists (
      select 1 from public.stores s
      where s.id = store_id and s.status::text in ('published', 'restricted')
    )
  );

drop policy if exists subscriptions_select_member on public.subscriptions;
create policy subscriptions_select_member
  on public.subscriptions for select to authenticated
  using (public.is_store_member(store_id) or exists (
    select 1 from public.stores s
    where s.id = store_id and s.owner_id = auth.uid()
  ));

drop policy if exists subscriptions_insert_owner on public.subscriptions;
create policy subscriptions_insert_owner
  on public.subscriptions for insert to authenticated
  with check (
    public.has_store_role(store_id, 'owner')
    or exists (
      select 1 from public.stores s
      where s.id = store_id and s.owner_id = auth.uid()
    )
  );

drop policy if exists subscriptions_update_owner on public.subscriptions;
create policy subscriptions_update_owner
  on public.subscriptions for update to authenticated
  using (public.has_store_role(store_id, 'owner'))
  with check (public.has_store_role(store_id, 'owner'));

drop policy if exists analytics_events_insert on public.analytics_events;
create policy analytics_events_insert
  on public.analytics_events for insert to anon, authenticated
  with check (
    exists (select 1 from public.stores s where s.id = store_id)
    and (
      product_id is null
      or exists (
        select 1 from public.products p
        where p.id = product_id and p.store_id = analytics_events.store_id
      )
    )
  );

drop policy if exists analytics_events_select_member on public.analytics_events;
create policy analytics_events_select_member
  on public.analytics_events for select to authenticated
  using (public.is_store_member(store_id));

-- ---------------------------------------------------------------------------
-- Storage: public reads, member writes under stores/{storeId}/...
-- ---------------------------------------------------------------------------

do $fn$
declare
  policy_name text;
begin
  if to_regclass('storage.objects') is null then
    return;
  end if;

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values (
    'store-media',
    'store-media',
    true,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
  )
  on conflict (id) do update
    set public = excluded.public,
        file_size_limit = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;

  for policy_name in
    select pol.policyname
    from pg_policies pol
    where pol.schemaname = 'storage'
      and pol.tablename = 'objects'
      and pol.policyname like 'store_media%'
  loop
    execute format('drop policy if exists %I on storage.objects', policy_name);
  end loop;

  execute 'drop policy if exists store_media_public_read on storage.objects';
  execute 'create policy store_media_public_read on storage.objects for select to anon, authenticated using (bucket_id = ''store-media'')';

  execute 'drop policy if exists store_media_member_insert on storage.objects';
  execute 'create policy store_media_member_insert on storage.objects for insert to authenticated with check (bucket_id = ''store-media'' and (storage.foldername(name))[1] = ''stores'' and public.is_store_member(((storage.foldername(name))[2])::uuid))';

  execute 'drop policy if exists store_media_member_delete on storage.objects';
  execute 'create policy store_media_member_delete on storage.objects for delete to authenticated using (bucket_id = ''store-media'' and (storage.foldername(name))[1] = ''stores'' and public.is_store_member(((storage.foldername(name))[2])::uuid))';
end
$fn$;
