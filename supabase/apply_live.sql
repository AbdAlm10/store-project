-- Delta for the live Supabase project (schema captured by diagnose_schema.sql).
-- Paste this whole file once in the Supabase SQL editor, from begin through commit.
-- Existing rows, enum labels, plans, and the live functions
-- is_store_member(target_store) and is_store_subscription_usable(target_store_id)
-- stay in place. This script only adds missing objects and replaces weak policies
-- by name. Safe to run again.

begin;

-- pgcrypto is created inside the referral section below (extensions.gen_random_bytes).

-- ---------------------------------------------------------------------------
-- Helpers. Do not replace is_store_member: its live argument name is target_store.
-- is_store_subscription_usable already uses target_store_id, so only the body
-- is aligned with the app. store_role_rank did not exist on the live database.
-- ---------------------------------------------------------------------------

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

create or replace function public.store_role_rank(role public.membership_role)
returns integer
language sql
immutable
as $fn$
  select public.store_role_rank(role::text);
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
    new.platform_role := 'merchant'::public.platform_role;
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

grant execute on function public.store_role_rank(text) to anon, authenticated;
grant execute on function public.store_role_rank(public.membership_role) to anon, authenticated;
grant execute on function public.has_store_role(uuid, text) to anon, authenticated;
grant execute on function public.is_store_member(uuid) to anon, authenticated;
grant execute on function public.is_store_subscription_usable(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Columns and checks that are missing on the live database.
-- billing_period is already present; the add is a no-op when it exists.
-- Path limits are NOT VALID so a long existing analytics row does not abort.
-- ---------------------------------------------------------------------------

alter table public.products
  add column if not exists client_request_id text;

create unique index if not exists products_store_client_request_id_key
  on public.products (store_id, client_request_id)
  where client_request_id is not null;

alter table public.subscriptions
  add column if not exists billing_period text not null default 'monthly';

do $fn$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'subscriptions_billing_period_check'
      and conrelid = 'public.subscriptions'::regclass
  ) then
    alter table public.subscriptions
      add constraint subscriptions_billing_period_check
      check (billing_period::text in ('monthly', 'yearly'));
  end if;
end
$fn$;

alter table public.analytics_events drop constraint if exists analytics_events_path_len_check;
alter table public.analytics_events
  add constraint analytics_events_path_len_check
  check (path is null or char_length(path) <= 500) not valid;

alter table public.analytics_events drop constraint if exists analytics_events_visitor_len_check;
alter table public.analytics_events
  add constraint analytics_events_visitor_len_check
  check (visitor_key is null or char_length(visitor_key) <= 80) not valid;

alter table public.analytics_events drop constraint if exists analytics_events_metadata_size_check;
alter table public.analytics_events
  add constraint analytics_events_metadata_size_check
  check (octet_length(metadata::text) <= 8000) not valid;

-- ---------------------------------------------------------------------------
-- Triggers. None of these existed on the public tables.
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


-- Referral ledger. Merchants cannot insert, update, or delete these rows.
-- Service role runs ensure_referral_code, attach_referral, and grant_referral_month.
-- Function bodies use a named dollar tag so the SQL editor keeps them in one piece.

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

-- Older databases may already have these functions with different argument
-- names. Drop every overload, then create the names the app calls
-- (p_user_id, p_referred_user_id, p_code, p_store_id). CASCADE drops policies
-- that call them. This file recreates those policies. Rows are not deleted.
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
        'normalize_contact_phone',
        'ensure_referral_code',
        'attach_referral',
        'grant_referral_month'
      )
  loop
    execute 'drop function if exists ' || sig || ' cascade';
  end loop;
end
$fn$;

create or replace function public.normalize_contact_phone(raw text)
returns text
language sql
immutable
as $fn$
  with cleaned as (
    select regexp_replace(coalesce(raw, ''), '[^0-9]', '', 'g') as digits
  )
  select case
    when digits = '' then null
    when digits like '00%' then
      case
        when length(digits) <= 2 then null
        when substring(digits from 3) like '0%'
          then nullif('963' || substring(substring(digits from 3) from 2), '963')
        else nullif(substring(digits from 3), '')
      end
    when digits like '0%' then nullif('963' || substring(digits from 2), '963')
    else digits
  end
  from cleaned;
$fn$;

create table if not exists public.referral_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  code text not null unique,
  created_at timestamptz not null default now(),
  constraint referral_codes_code_format check (code ~ '^[A-Za-z0-9_-]{16,64}$')
);

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_user_id uuid not null references public.profiles (id) on delete cascade,
  referred_user_id uuid not null unique references public.profiles (id) on delete cascade,
  code text not null,
  status text not null,
  reject_reason text,
  created_at timestamptz not null default now(),
  rewarded_at timestamptz,
  constraint referrals_status check (status::text in ('pending', 'rewarded', 'rejected')),
  constraint referrals_not_self check (referrer_user_id <> referred_user_id)
);

create table if not exists public.referral_rewards (
  id uuid primary key default gen_random_uuid(),
  referral_id uuid not null references public.referrals (id) on delete cascade,
  beneficiary_user_id uuid not null references public.profiles (id) on delete cascade,
  days integer not null default 30,
  created_at timestamptz not null default now(),
  constraint referral_rewards_one_month check (days = 30),
  constraint referral_rewards_once unique (referral_id, beneficiary_user_id)
);

create table if not exists public.referral_audit_log (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  actor_user_id uuid,
  referrer_user_id uuid,
  referred_user_id uuid,
  referral_id uuid,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

drop index if exists public.referrals_referrer_idx;
create index referrals_referrer_idx
  on public.referrals (referrer_user_id, created_at desc);

alter table public.referral_codes drop constraint if exists referral_codes_code_format;
alter table public.referral_codes
  add constraint referral_codes_code_format
  check (code ~ '^[A-Za-z0-9_-]{16,64}$');

alter table public.referral_codes drop constraint if exists referral_codes_user_id_key;
alter table public.referral_codes
  add constraint referral_codes_user_id_key unique (user_id);

alter table public.referral_codes drop constraint if exists referral_codes_code_key;
alter table public.referral_codes
  add constraint referral_codes_code_key unique (code);

alter table public.referrals drop constraint if exists referrals_status;
alter table public.referrals
  add constraint referrals_status
  check (status::text in ('pending', 'rewarded', 'rejected'));

alter table public.referrals drop constraint if exists referrals_not_self;
alter table public.referrals
  add constraint referrals_not_self
  check (referrer_user_id <> referred_user_id);

alter table public.referrals drop constraint if exists referrals_referred_user_id_key;
alter table public.referrals
  add constraint referrals_referred_user_id_key unique (referred_user_id);

alter table public.referral_rewards drop constraint if exists referral_rewards_one_month;
alter table public.referral_rewards
  add constraint referral_rewards_one_month
  check (days = 30);

alter table public.referral_rewards drop constraint if exists referral_rewards_once;
alter table public.referral_rewards
  add constraint referral_rewards_once unique (referral_id, beneficiary_user_id);

alter table public.referral_codes enable row level security;
alter table public.referrals enable row level security;
alter table public.referral_rewards enable row level security;
alter table public.referral_audit_log enable row level security;

do $fn$
declare
  policy_name text;
  target_table text;
begin
  foreach target_table in array array[
    'referral_codes', 'referrals', 'referral_rewards', 'referral_audit_log'
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

revoke all on public.referral_codes from anon, authenticated;
revoke all on public.referrals from anon, authenticated;
revoke all on public.referral_rewards from anon, authenticated;
revoke all on public.referral_audit_log from anon, authenticated;

grant select on public.referral_codes to authenticated;
grant select on public.referrals to authenticated;
grant select on public.referral_rewards to authenticated;

drop policy if exists referral_codes_select_own on public.referral_codes;
create policy referral_codes_select_own
  on public.referral_codes
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists referrals_select_own on public.referrals;
create policy referrals_select_own
  on public.referrals
  for select
  to authenticated
  using (referrer_user_id = auth.uid() or referred_user_id = auth.uid());

drop policy if exists referral_rewards_select_own on public.referral_rewards;
create policy referral_rewards_select_own
  on public.referral_rewards
  for select
  to authenticated
  using (beneficiary_user_id = auth.uid());

-- No insert/update/delete policies. Audit log has no select policy either.

create or replace function public.ensure_referral_code(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $fn$
declare
  existing text;
  created text;
begin
  select code into existing from public.referral_codes where user_id = p_user_id;
  if existing is not null then
    return existing;
  end if;

  created := translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/=', '-_');
  insert into public.referral_codes (user_id, code) values (p_user_id, created);
  insert into public.referral_audit_log (event_type, referrer_user_id, detail)
  values ('code_created', p_user_id, jsonb_build_object('code_length', char_length(created)));
  return created;
exception
  when unique_violation then
    select code into existing from public.referral_codes where user_id = p_user_id;
    return existing;
end;
$fn$;

create or replace function public.attach_referral(p_referred_user_id uuid, p_code text)
returns text
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_owner uuid;
  v_existing uuid;
  v_referrer_email text;
  v_referred_email text;
  v_id uuid;
begin
  if p_code is null or p_code !~ '^[A-Za-z0-9_-]{16,64}$' then
    insert into public.referral_audit_log (event_type, referred_user_id, detail)
    values ('attach_rejected', p_referred_user_id, '{"reason":"invalid_code"}'::jsonb);
    return 'rejected';
  end if;

  select user_id into v_owner from public.referral_codes where code = p_code;
  if v_owner is null then
    insert into public.referral_audit_log (event_type, referred_user_id, detail)
    values ('attach_rejected', p_referred_user_id, '{"reason":"invalid_code"}'::jsonb);
    return 'rejected';
  end if;

  if v_owner = p_referred_user_id then
    insert into public.referral_audit_log (event_type, referrer_user_id, referred_user_id, detail)
    values ('attach_rejected', v_owner, p_referred_user_id, '{"reason":"self"}'::jsonb);
    return 'rejected';
  end if;

  select id into v_existing from public.referrals where referred_user_id = p_referred_user_id;
  if v_existing is not null then
    insert into public.referral_audit_log (event_type, referrer_user_id, referred_user_id, referral_id, detail)
    values ('attach_ignored', v_owner, p_referred_user_id, v_existing, '{"reason":"already_attached"}'::jsonb);
    return 'ignored';
  end if;

  select lower(trim(email)) into v_referrer_email from public.profiles where id = v_owner;
  select lower(trim(email)) into v_referred_email from public.profiles where id = p_referred_user_id;

  if v_referrer_email is not null and v_referrer_email = v_referred_email then
    insert into public.referrals (referrer_user_id, referred_user_id, code, status, reject_reason)
    values (v_owner, p_referred_user_id, p_code, 'rejected', 'duplicate_email')
    returning id into v_id;
    insert into public.referral_audit_log (event_type, referrer_user_id, referred_user_id, referral_id, detail)
    values ('attach_rejected', v_owner, p_referred_user_id, v_id, '{"reason":"duplicate_email"}'::jsonb);
    return 'rejected';
  end if;

  if exists (
    select 1
    from public.stores referrer_store
    cross join lateral (values (referrer_store.phone), (referrer_store.whatsapp)) as referrer_phone(raw)
    join public.stores referred_store on referred_store.owner_id = p_referred_user_id
    cross join lateral (values (referred_store.phone), (referred_store.whatsapp)) as referred_phone(raw)
    where referrer_store.owner_id = v_owner
      and public.normalize_contact_phone(referrer_phone.raw) is not null
      and public.normalize_contact_phone(referrer_phone.raw) = public.normalize_contact_phone(referred_phone.raw)
  ) or exists (
    select 1
    from public.stores referrer_store
    join public.stores referred_store
      on lower(trim(referrer_store.email)) = lower(trim(referred_store.email))
    where referrer_store.owner_id = v_owner
      and referred_store.owner_id = p_referred_user_id
      and referrer_store.email is not null
      and length(trim(referrer_store.email)) > 0
  ) then
    insert into public.referrals (referrer_user_id, referred_user_id, code, status, reject_reason)
    values (v_owner, p_referred_user_id, p_code, 'rejected', 'duplicate_phone')
    returning id into v_id;
    insert into public.referral_audit_log (event_type, referrer_user_id, referred_user_id, referral_id, detail)
    values (
      'attach_rejected',
      v_owner,
      p_referred_user_id,
      v_id,
      '{"reason":"duplicate_phone"}'::jsonb
    );
    return 'rejected';
  end if;

  insert into public.referrals (referrer_user_id, referred_user_id, code, status)
  values (v_owner, p_referred_user_id, p_code, 'pending')
  returning id into v_id;
  insert into public.referral_audit_log (event_type, referrer_user_id, referred_user_id, referral_id, detail)
  values ('attach_pending', v_owner, p_referred_user_id, v_id, '{}'::jsonb);
  return 'pending';
exception
  when unique_violation then
    return 'ignored';
end;
$fn$;

create or replace function public.grant_referral_month(
  p_referred_user_id uuid,
  p_store_id uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_ref public.referrals%rowtype;
  v_referrer_email text;
  v_referred_email text;
  v_plan text;
  v_status text;
  v_end timestamptz;
  v_referrer_sub uuid;
  v_referrer_plan text;
  v_referrer_status text;
  v_referrer_store uuid;
  v_referrer_suspended timestamptz;
  v_referrer_store_status text;
begin
  select * into v_ref
  from public.referrals
  where referred_user_id = p_referred_user_id
  for update;

  if not found then
    insert into public.referral_audit_log (event_type, referred_user_id, detail)
    values ('reward_skipped', p_referred_user_id, '{"reason":"no_referral"}'::jsonb);
    return 'skipped';
  end if;

  if v_ref.status = 'rewarded' then
    insert into public.referral_audit_log (event_type, referrer_user_id, referred_user_id, referral_id, detail)
    values ('reward_already', v_ref.referrer_user_id, p_referred_user_id, v_ref.id, '{}'::jsonb);
    return 'already_rewarded';
  end if;

  if v_ref.status = 'rejected' or v_ref.referrer_user_id = p_referred_user_id then
    insert into public.referral_audit_log (event_type, referrer_user_id, referred_user_id, referral_id, detail)
    values (
      'reward_rejected',
      v_ref.referrer_user_id,
      p_referred_user_id,
      v_ref.id,
      jsonb_build_object('reason', coalesce(v_ref.reject_reason, 'self'))
    );
    return 'rejected';
  end if;

  select lower(trim(email)) into v_referrer_email from public.profiles where id = v_ref.referrer_user_id;
  select lower(trim(email)) into v_referred_email from public.profiles where id = p_referred_user_id;

  if v_referrer_email is not null and v_referrer_email = v_referred_email then
    update public.referrals
      set status = 'rejected', reject_reason = 'duplicate_email'
      where id = v_ref.id;
    insert into public.referral_audit_log (event_type, referrer_user_id, referred_user_id, referral_id, detail)
    values ('reward_rejected', v_ref.referrer_user_id, p_referred_user_id, v_ref.id, '{"reason":"duplicate_email"}'::jsonb);
    return 'rejected';
  end if;

  if exists (
    select 1
    from public.stores referrer_store
    cross join lateral (values (referrer_store.phone), (referrer_store.whatsapp)) as referrer_phone(raw)
    join public.stores referred_store on referred_store.owner_id = p_referred_user_id
    cross join lateral (values (referred_store.phone), (referred_store.whatsapp)) as referred_phone(raw)
    where referrer_store.owner_id = v_ref.referrer_user_id
      and public.normalize_contact_phone(referrer_phone.raw) is not null
      and public.normalize_contact_phone(referrer_phone.raw) = public.normalize_contact_phone(referred_phone.raw)
  ) or exists (
    select 1
    from public.stores referrer_store
    join public.stores referred_store
      on lower(trim(referrer_store.email)) = lower(trim(referred_store.email))
    where referrer_store.owner_id = v_ref.referrer_user_id
      and referred_store.owner_id = p_referred_user_id
      and referrer_store.email is not null
      and length(trim(referrer_store.email)) > 0
  ) then
    update public.referrals
      set status = 'rejected', reject_reason = 'duplicate_phone'
      where id = v_ref.id;
    insert into public.referral_audit_log (event_type, referrer_user_id, referred_user_id, referral_id, detail)
    values ('reward_rejected', v_ref.referrer_user_id, p_referred_user_id, v_ref.id, '{"reason":"duplicate_phone"}'::jsonb);
    return 'rejected';
  end if;

  select s.plan_id::text, s.status::text, s.current_period_end
    into v_plan, v_status, v_end
  from public.subscriptions s
  join public.stores st on st.id = s.store_id
  where s.store_id = p_store_id
    and st.owner_id = p_referred_user_id
    and s.plan_id::text in ('basic', 'pro')
    and s.status::text = 'active'
    and s.current_period_end > now();

  if v_plan is null then
    insert into public.referral_audit_log (event_type, referrer_user_id, referred_user_id, referral_id, detail)
    values ('reward_skipped', v_ref.referrer_user_id, p_referred_user_id, v_ref.id, '{"reason":"not_paid"}'::jsonb);
    return 'skipped';
  end if;

  update public.subscriptions
    set current_period_end = current_period_end + interval '30 days',
        updated_at = now()
    where store_id = p_store_id;

  select s.id, s.plan_id::text, s.status::text, st.id, st.suspended_at, st.status::text
    into v_referrer_sub, v_referrer_plan, v_referrer_status, v_referrer_store, v_referrer_suspended, v_referrer_store_status
  from public.subscriptions s
  join public.stores st on st.id = s.store_id
  where st.owner_id = v_ref.referrer_user_id
  order by
    case
      when s.status::text in ('active', 'trialing', 'past_due')
        and (
          (s.plan_id::text = 'trial' and (s.trial_ends_at is null or s.trial_ends_at >= now()))
          or (s.plan_id::text <> 'trial' and (s.current_period_end is null or s.current_period_end >= now()))
        )
      then 0 else 1
    end,
    s.updated_at desc
  limit 1;

  if v_referrer_sub is not null then
    if v_referrer_plan = 'trial' or v_referrer_status = 'trialing' then
      update public.subscriptions
        set trial_ends_at = case
              when trial_ends_at is not null and trial_ends_at > now() then trial_ends_at + interval '30 days'
              else now() + interval '30 days'
            end,
            current_period_end = case
              when current_period_end is not null and current_period_end > now() then current_period_end + interval '30 days'
              else now() + interval '30 days'
            end,
            status = 'trialing'::public.subscription_status,
            updated_at = now()
        where id = v_referrer_sub;
    else
      update public.subscriptions
        set current_period_end = case
              when current_period_end is not null and current_period_end > now() then current_period_end + interval '30 days'
              else now() + interval '30 days'
            end,
            status = 'active'::public.subscription_status,
            updated_at = now()
        where id = v_referrer_sub;
    end if;

    if v_referrer_store_status = 'restricted' and v_referrer_suspended is null then
      update public.stores
        set status = 'published'::public.store_status, updated_at = now()
        where id = v_referrer_store;
    end if;
  end if;

  insert into public.referral_rewards (referral_id, beneficiary_user_id, days)
  values
    (v_ref.id, p_referred_user_id, 30),
    (v_ref.id, v_ref.referrer_user_id, 30);

  update public.referrals
    set status = 'rewarded', rewarded_at = now()
    where id = v_ref.id;

  insert into public.referral_audit_log (event_type, referrer_user_id, referred_user_id, referral_id, detail)
  values (
    'reward_granted',
    v_ref.referrer_user_id,
    p_referred_user_id,
    v_ref.id,
    jsonb_build_object('days', 30, 'store_id', p_store_id, 'referrer_subscription_id', v_referrer_sub)
  );
  return 'rewarded';
exception
  when unique_violation then
    update public.referrals
      set status = 'rewarded', rewarded_at = coalesce(rewarded_at, now())
      where id = v_ref.id;
    insert into public.referral_audit_log (event_type, referrer_user_id, referred_user_id, referral_id, detail)
    values (
      'reward_already',
      v_ref.referrer_user_id,
      p_referred_user_id,
      v_ref.id,
      '{"reason":"unique_violation"}'::jsonb
    );
    return 'already_rewarded';
end;
$fn$;

revoke all on function public.normalize_contact_phone(text) from public, anon, authenticated;
revoke all on function public.ensure_referral_code(uuid) from public, anon, authenticated;
revoke all on function public.attach_referral(uuid, text) from public, anon, authenticated;
revoke all on function public.grant_referral_month(uuid, uuid) from public, anon, authenticated;

grant execute on function public.normalize_contact_phone(text) to service_role;
grant execute on function public.ensure_referral_code(uuid) to service_role;
grant execute on function public.attach_referral(uuid, text) to service_role;
grant execute on function public.grant_referral_month(uuid, uuid) to service_role;

do $fn$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant select, insert, update, delete on public.referral_codes to service_role;
    grant select, insert, update, delete on public.referrals to service_role;
    grant select, insert, update, delete on public.referral_rewards to service_role;
    grant select, insert on public.referral_audit_log to service_role;
  end if;
end $fn$;

-- ---------------------------------------------------------------------------
-- Privileges for the tables that already exist.
-- plans stays readable. Referral privileges are set in the section above.
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
revoke all on public.support_messages from anon, authenticated;

grant select, insert on public.profiles to authenticated;
grant update (email, full_name, avatar_url, locale, updated_at)
  on public.profiles to authenticated;
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

grant select, insert on public.support_messages to authenticated;

do $fn$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant all privileges on all tables in schema public to service_role;
    grant execute on all functions in schema public to service_role;
  end if;
end
$fn$;

-- Referral RPCs stay service-role only. The blanket grant above is undone here.
revoke all on function public.normalize_contact_phone(text) from public, anon, authenticated;
revoke all on function public.ensure_referral_code(uuid) from public, anon, authenticated;
revoke all on function public.attach_referral(uuid, text) from public, anon, authenticated;
revoke all on function public.grant_referral_month(uuid, uuid) from public, anon, authenticated;
grant execute on function public.normalize_contact_phone(text) to service_role;
grant execute on function public.ensure_referral_code(uuid) to service_role;
grant execute on function public.attach_referral(uuid, text) to service_role;
grant execute on function public.grant_referral_month(uuid, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Replace weak and duplicate policies by the names on the live database.
-- plans_read_all is kept: the plan catalog is not tenant data.
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
alter table public.support_messages enable row level security;

drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists profiles_insert_self on public.profiles;
drop policy if exists profiles_select_self on public.profiles;
drop policy if exists profiles_update_self on public.profiles;
drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;

create policy profiles_select_own
  on public.profiles for select to authenticated
  using (id = auth.uid());

create policy profiles_insert_own
  on public.profiles for insert to authenticated
  with check (id = auth.uid());

create policy profiles_update_own
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists stores_select on public.stores;
drop policy if exists stores_owner_insert on public.stores;
drop policy if exists stores_update on public.stores;
drop policy if exists stores_insert_own on public.stores;
drop policy if exists stores_update_manager on public.stores;

create policy stores_select
  on public.stores for select to anon, authenticated
  using (
    status::text in ('published', 'restricted')
    or owner_id = auth.uid()
    or public.is_store_member(id)
  );

create policy stores_insert_own
  on public.stores for insert to authenticated
  with check (owner_id = auth.uid());

create policy stores_update_manager
  on public.stores for update to authenticated
  using (public.has_store_role(id, 'manager') or owner_id = auth.uid())
  with check (public.has_store_role(id, 'manager') or owner_id = auth.uid());

drop policy if exists store_members_select on public.store_members;
drop policy if exists store_members_insert on public.store_members;
drop policy if exists store_members_update on public.store_members;
drop policy if exists store_members_delete on public.store_members;
drop policy if exists store_members_update_owner on public.store_members;
drop policy if exists store_members_delete_owner on public.store_members;

create policy store_members_select
  on public.store_members for select to authenticated
  using (user_id = auth.uid() or public.is_store_member(store_id));

create policy store_members_insert
  on public.store_members for insert to authenticated
  with check (
    (
      user_id = auth.uid()
      and role::text = 'owner'
      and exists (
        select 1 from public.stores s
        where s.id = store_id and s.owner_id = auth.uid()
      )
    )
    or public.has_store_role(store_id, 'owner')
  );

create policy store_members_update_owner
  on public.store_members for update to authenticated
  using (public.has_store_role(store_id, 'owner'))
  with check (public.has_store_role(store_id, 'owner'));

create policy store_members_delete_owner
  on public.store_members for delete to authenticated
  using (public.has_store_role(store_id, 'owner'));

drop policy if exists categories_public_read on public.categories;
drop policy if exists categories_member_write on public.categories;
drop policy if exists categories_select on public.categories;
drop policy if exists categories_write on public.categories;
drop policy if exists categories_update on public.categories;
drop policy if exists categories_delete on public.categories;

create policy categories_select
  on public.categories for select to anon, authenticated
  using (
    public.is_store_member(store_id)
    or exists (
      select 1 from public.stores s
      where s.id = store_id and s.status::text in ('published', 'restricted')
    )
  );

create policy categories_write
  on public.categories for insert to authenticated
  with check (public.is_store_member(store_id));

create policy categories_update
  on public.categories for update to authenticated
  using (public.is_store_member(store_id))
  with check (public.is_store_member(store_id));

create policy categories_delete
  on public.categories for delete to authenticated
  using (public.is_store_member(store_id));

drop policy if exists products_public_read on public.products;
drop policy if exists products_member_write on public.products;
drop policy if exists products_select on public.products;
drop policy if exists products_insert on public.products;
drop policy if exists products_update on public.products;
drop policy if exists products_delete on public.products;

create policy products_select
  on public.products for select to anon, authenticated
  using (
    public.is_store_member(store_id)
    or (
      status::text = 'published'
      and exists (
        select 1 from public.stores s
        where s.id = store_id and s.status::text in ('published', 'restricted')
      )
    )
  );

create policy products_insert
  on public.products for insert to authenticated
  with check (public.is_store_member(store_id));

create policy products_update
  on public.products for update to authenticated
  using (public.is_store_member(store_id))
  with check (public.is_store_member(store_id));

create policy products_delete
  on public.products for delete to authenticated
  using (public.is_store_member(store_id));

drop policy if exists product_images_public_read on public.product_images;
drop policy if exists product_images_member_write on public.product_images;
drop policy if exists product_images_select on public.product_images;
drop policy if exists product_images_write on public.product_images;
drop policy if exists product_images_update on public.product_images;
drop policy if exists product_images_delete on public.product_images;

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
        and s.status::text in ('published', 'restricted')
    )
  );

create policy product_images_write
  on public.product_images for insert to authenticated
  with check (public.is_store_member(store_id));

create policy product_images_update
  on public.product_images for update to authenticated
  using (public.is_store_member(store_id))
  with check (public.is_store_member(store_id));

create policy product_images_delete
  on public.product_images for delete to authenticated
  using (public.is_store_member(store_id));

drop policy if exists product_variants_public_read on public.product_variants;
drop policy if exists product_variants_member_write on public.product_variants;
drop policy if exists product_variants_select on public.product_variants;
drop policy if exists product_variants_write on public.product_variants;
drop policy if exists product_variants_update on public.product_variants;
drop policy if exists product_variants_delete on public.product_variants;

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
        and s.status::text in ('published', 'restricted')
    )
  );

create policy product_variants_write
  on public.product_variants for insert to authenticated
  with check (public.is_store_member(store_id));

create policy product_variants_update
  on public.product_variants for update to authenticated
  using (public.is_store_member(store_id))
  with check (public.is_store_member(store_id));

create policy product_variants_delete
  on public.product_variants for delete to authenticated
  using (public.is_store_member(store_id));

drop policy if exists subscriptions_member_read on public.subscriptions;
drop policy if exists subscriptions_update_member on public.subscriptions;
drop policy if exists subscriptions_insert_owner on public.subscriptions;
drop policy if exists subscriptions_select_public on public.subscriptions;
drop policy if exists subscriptions_select_member on public.subscriptions;
drop policy if exists subscriptions_update_owner on public.subscriptions;

create policy subscriptions_select_public
  on public.subscriptions for select to anon
  using (
    exists (
      select 1 from public.stores s
      where s.id = store_id and s.status::text in ('published', 'restricted')
    )
  );

create policy subscriptions_select_member
  on public.subscriptions for select to authenticated
  using (
    public.is_store_member(store_id)
    or exists (
      select 1 from public.stores s
      where s.id = store_id and s.owner_id = auth.uid()
    )
  );

create policy subscriptions_insert_owner
  on public.subscriptions for insert to authenticated
  with check (
    public.has_store_role(store_id, 'owner')
    or exists (
      select 1 from public.stores s
      where s.id = store_id and s.owner_id = auth.uid()
    )
  );

create policy subscriptions_update_owner
  on public.subscriptions for update to authenticated
  using (public.has_store_role(store_id, 'owner'))
  with check (public.has_store_role(store_id, 'owner'));

drop policy if exists analytics_insert_public on public.analytics_events;
drop policy if exists analytics_member_read on public.analytics_events;
drop policy if exists analytics_events_insert on public.analytics_events;
drop policy if exists analytics_events_select_member on public.analytics_events;

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

create policy analytics_events_select_member
  on public.analytics_events for select to authenticated
  using (public.is_store_member(store_id));

drop policy if exists support_messages_insert_system_own on public.support_messages;
drop policy if exists support_messages_insert_own on public.support_messages;
drop policy if exists support_messages_select_own on public.support_messages;

create policy support_messages_insert_own
  on public.support_messages
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and sender::text = 'user'
  );

create policy support_messages_select_own
  on public.support_messages
  for select
  to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Storage. Drop the four live store-media policies, including the update
-- policy that had no WITH CHECK, then recreate them for members of that store.
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

  execute 'alter table storage.objects enable row level security';

  foreach policy_name in array array[
    'store_media_public_read',
    'store_media_member_insert',
    'store_media_member_update',
    'store_media_member_delete'
  ]
  loop
    execute format('drop policy if exists %I on storage.objects', policy_name);
  end loop;

  execute 'create policy store_media_public_read on storage.objects for select to anon, authenticated using (bucket_id = ''store-media'')';
  execute 'create policy store_media_member_insert on storage.objects for insert to authenticated with check (bucket_id = ''store-media'' and (storage.foldername(name))[1] = ''stores'' and public.is_store_member(((storage.foldername(name))[2])::uuid))';
  execute 'create policy store_media_member_update on storage.objects for update to authenticated using (bucket_id = ''store-media'' and (storage.foldername(name))[1] = ''stores'' and public.is_store_member(((storage.foldername(name))[2])::uuid)) with check (bucket_id = ''store-media'' and (storage.foldername(name))[1] = ''stores'' and public.is_store_member(((storage.foldername(name))[2])::uuid))';
  execute 'create policy store_media_member_delete on storage.objects for delete to authenticated using (bucket_id = ''store-media'' and (storage.foldername(name))[1] = ''stores'' and public.is_store_member(((storage.foldername(name))[2])::uuid))';

  execute 'grant select on storage.objects to anon, authenticated';
  execute 'grant insert, update, delete on storage.objects to authenticated';
end
$fn$;

commit;
