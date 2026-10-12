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
  constraint referrals_status check (status in ('pending', 'rewarded', 'rejected')),
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
  check (status in ('pending', 'rewarded', 'rejected'));

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

  select s.plan_id, s.status, s.current_period_end
    into v_plan, v_status, v_end
  from public.subscriptions s
  join public.stores st on st.id = s.store_id
  where s.store_id = p_store_id
    and st.owner_id = p_referred_user_id
    and s.plan_id in ('basic', 'pro')
    and s.status = 'active'
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

  select s.id, s.plan_id, s.status, st.id, st.suspended_at, st.status
    into v_referrer_sub, v_referrer_plan, v_referrer_status, v_referrer_store, v_referrer_suspended, v_referrer_store_status
  from public.subscriptions s
  join public.stores st on st.id = s.store_id
  where st.owner_id = v_ref.referrer_user_id
  order by
    case
      when s.status in ('active', 'trialing', 'past_due')
        and (
          (s.plan_id = 'trial' and (s.trial_ends_at is null or s.trial_ends_at >= now()))
          or (s.plan_id <> 'trial' and (s.current_period_end is null or s.current_period_end >= now()))
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
            status = 'trialing',
            updated_at = now()
        where id = v_referrer_sub;
    else
      update public.subscriptions
        set current_period_end = case
              when current_period_end is not null and current_period_end > now() then current_period_end + interval '30 days'
              else now() + interval '30 days'
            end,
            status = 'active',
            updated_at = now()
        where id = v_referrer_sub;
    end if;

    if v_referrer_store_status = 'restricted' and v_referrer_suspended is null then
      update public.stores
        set status = 'published', updated_at = now()
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
