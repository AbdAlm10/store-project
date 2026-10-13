-- Local tenant-isolation checks for the schema produced by supabase/apply_live.sql.
-- Run with psql against the recreated database. Do not paste this on production.
-- Roles anon, authenticated, service_role, and authenticator must already exist,
-- and auth.uid()/auth.jwt() must read request.jwt.claim.sub and request.jwt.claims.

do $fn$
declare
  missing text;
begin
  select string_agg(item, ', ') into missing
  from (
    select 'products.client_request_id' as item
    where not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'products' and column_name = 'client_request_id'
    )
    union all
    select 'subscriptions.billing_period'
    where not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'subscriptions' and column_name = 'billing_period'
    )
    union all
    select 'stores.theme_overrides'
    where not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'stores' and column_name = 'theme_overrides'
    )
    union all
    select 'categories.option_schema'
    where not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'categories' and column_name = 'option_schema'
    )
    union all
    select 'referrals.referred_user_id'
    where not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'referrals' and column_name = 'referred_user_id'
    )
    union all
    select 'referrals.status'
    where not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'referrals' and column_name = 'status'
    )
    union all
    select 'referrals.rewarded_at'
    where not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'referrals' and column_name = 'rewarded_at'
    )
    union all
    select 'referral_codes'
    where to_regclass('public.referral_codes') is null
    union all
    select 'referral_rewards'
    where to_regclass('public.referral_rewards') is null
    union all
    select 'referral_audit_log'
    where to_regclass('public.referral_audit_log') is null
  ) gaps;
  if missing is not null then
    raise exception 'missing app columns: %', missing;
  end if;

  if (
    select pg_get_function_identity_arguments(p.oid)
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'is_store_member'
  ) is distinct from 'target_store uuid' then
    raise exception 'is_store_member argument name changed';
  end if;

  if (
    select pg_get_function_identity_arguments(p.oid)
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'is_store_subscription_usable'
  ) is distinct from 'target_store_id uuid' then
    raise exception 'is_store_subscription_usable argument name changed';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and policyname in (
        'analytics_insert_public',
        'support_messages_insert_system_own',
        'Users can update own profile',
        'subscriptions_update_member',
        'products_member_write',
        'categories_member_write'
      )
  ) then
    raise exception 'weak live policy is still present';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'plans' and policyname = 'plans_read_all'
  ) then
    raise exception 'plans_read_all was removed';
  end if;
end
$fn$;

begin;

insert into public.plans (id, name, limits)
values
  ('trial', 'Trial', '{}'::jsonb),
  ('basic', 'Basic', '{}'::jsonb),
  ('pro', 'Pro', '{}'::jsonb)
on conflict (id) do nothing;

insert into auth.users (id, email) values
  ('11111111-1111-4111-8111-111111111111', 'owner-a@example.com'),
  ('22222222-2222-4222-8222-222222222222', 'owner-b@example.com'),
  ('33333333-3333-4333-8333-333333333333', 'staff-a@example.com'),
  ('44444444-4444-4444-8444-444444444444', 'new-user@example.com');

insert into public.profiles (id, email, platform_role) values
  ('11111111-1111-4111-8111-111111111111', 'owner-a@example.com', 'merchant'),
  ('22222222-2222-4222-8222-222222222222', 'owner-b@example.com', 'merchant'),
  ('33333333-3333-4333-8333-333333333333', 'staff-a@example.com', 'merchant');

insert into public.stores (id, owner_id, name, slug, status) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'Store A', 'store-a', 'published'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222222', 'Store B', 'store-b', 'draft'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '22222222-2222-4222-8222-222222222222', 'Store C', 'store-c', 'restricted');

insert into public.store_members (store_id, user_id, role) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'owner'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '33333333-3333-4333-8333-333333333333', 'staff'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222222', 'owner'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '22222222-2222-4222-8222-222222222222', 'owner');

insert into public.products (id, store_id, name, slug, price, currency, status) values
  ('a1111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Public A', 'public-a', 10, 'USD', 'published'),
  ('a2222222-2222-4222-8222-222222222222', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Draft A', 'draft-a', 10, 'USD', 'draft'),
  ('b1111111-1111-4111-8111-111111111111', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Public B', 'public-b', 10, 'USD', 'published'),
  ('c1111111-1111-4111-8111-111111111111', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Public C', 'public-c', 10, 'USD', 'published');

insert into public.subscriptions (store_id, plan_id, status, billing_period, current_period_end) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'basic', 'active', 'monthly', now() + interval '10 days'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'basic', 'active', 'monthly', now() + interval '10 days');

insert into storage.objects (bucket_id, name)
values ('store-media', 'stores/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/logo.png');

create function public._rls_expect(cond boolean, msg text)
returns void
language plpgsql
as $fn$
begin
  if coalesce(cond, false) = false then
    raise exception 'RLS assert failed: %', msg;
  end if;
end;
$fn$;

create function public._rls_updated_products(pid uuid, new_name text)
returns integer
language plpgsql
as $fn$
declare
  n integer;
begin
  update public.products set name = new_name where id = pid;
  get diagnostics n = row_count;
  return n;
end;
$fn$;

grant execute on function public._rls_expect(boolean, text) to anon, authenticated, authenticator;
grant execute on function public._rls_updated_products(uuid, text) to anon, authenticated, authenticator;

-- Visitor: published and restricted storefronts only.
set session authorization authenticator;
set role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select set_config('request.jwt.claim.sub', '', true);

select public._rls_expect(
  (select count(*) = 1 from public.stores where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  'anon should read the published store'
);
select public._rls_expect(
  (select count(*) = 1 from public.stores where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'),
  'anon should read the restricted store'
);
select public._rls_expect(
  (select count(*) = 0 from public.stores where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  'anon should not read the draft store'
);
select public._rls_expect(
  (select count(*) = 1 from public.products where id = 'a1111111-1111-4111-8111-111111111111'),
  'anon should read a published product'
);
select public._rls_expect(
  (select count(*) = 0 from public.products where id = 'a2222222-2222-4222-8222-222222222222'),
  'anon should not read a draft product'
);
select public._rls_expect(
  (select count(*) = 0 from public.products where id = 'b1111111-1111-4111-8111-111111111111'),
  'anon should not read a product from a draft store'
);
select public._rls_expect(
  (select count(*) = 1 from public.products where id = 'c1111111-1111-4111-8111-111111111111'),
  'anon should read a published product on a restricted store'
);
select public._rls_expect(
  (select count(*) = 1 from public.subscriptions where store_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  'anon should read the subscription of a published store'
);
select public._rls_expect(
  (select count(*) = 0 from public.subscriptions where store_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  'anon should not read the subscription of a draft store'
);
select public._rls_expect(
  (select count(*) = 1 from storage.objects where name like 'stores/aaaaaaaa%'),
  'anon should read store media'
);

do $fn$
begin
  insert into public.analytics_events (store_id, event_type)
  values ('99999999-9999-4999-8999-999999999999', 'store_view');
  raise exception 'RLS assert failed: analytics insert for a missing store succeeded';
exception
  when insufficient_privilege then
    null;
end
$fn$;

do $fn$
begin
  insert into public.analytics_events (store_id, product_id, event_type)
  values (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'b1111111-1111-4111-8111-111111111111',
    'product_view'
  );
  raise exception 'RLS assert failed: analytics insert accepted another store product';
exception
  when insufficient_privilege then
    null;
end
$fn$;

insert into public.analytics_events (store_id, product_id, event_type)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'a1111111-1111-4111-8111-111111111111',
  'whatsapp_click'
);

do $fn$
begin
  perform count(*) from public.analytics_events;
  raise exception 'RLS assert failed: anon read analytics';
exception
  when insufficient_privilege then
    null;
end
$fn$;

-- Merchant A.
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"11111111-1111-4111-8111-111111111111"}',
  true
);

select public._rls_expect(
  (select count(*) = 1 from public.profiles where id = '11111111-1111-4111-8111-111111111111'),
  'merchant A should read their own profile'
);
select public._rls_expect(
  (select count(*) = 0 from public.profiles where id = '22222222-2222-4222-8222-222222222222'),
  'merchant A should not read merchant B profile'
);
select public._rls_expect(
  (select count(*) = 2 from public.products where store_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  'merchant A should read draft and published products of their store'
);
select public._rls_expect(
  (select count(*) = 0 from public.products where store_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  'merchant A should not read store B products'
);
select public._rls_expect(
  public._rls_updated_products('b1111111-1111-4111-8111-111111111111', 'hacked') = 0,
  'merchant A should not update store B products'
);
select public._rls_expect(
  (select count(*) = 0 from public.store_members where user_id = '22222222-2222-4222-8222-222222222222'),
  'merchant A should not read store B members'
);

do $fn$
begin
  insert into public.support_messages (user_id, sender, body)
  values ('11111111-1111-4111-8111-111111111111', 'system', 'hello');
  raise exception 'RLS assert failed: merchant inserted a system support message';
exception
  when insufficient_privilege then
    null;
end
$fn$;

insert into public.support_messages (user_id, sender, body)
values ('11111111-1111-4111-8111-111111111111', 'user', 'hello');

do $fn$
begin
  insert into public.referrals (referrer_user_id, referred_user_id, code, status)
  values (
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222',
    'abcdefghijklmnopqr',
    'pending'
  );
  raise exception 'RLS assert failed: merchant inserted a referral';
exception
  when insufficient_privilege then
    null;
end
$fn$;

do $fn$
begin
  perform public.ensure_referral_code('11111111-1111-4111-8111-111111111111'::uuid);
  raise exception 'RLS assert failed: merchant called ensure_referral_code';
exception
  when insufficient_privilege then
    null;
end
$fn$;

do $fn$
begin
  update public.profiles
    set platform_role = 'admin'
    where id = '11111111-1111-4111-8111-111111111111';
  raise exception 'RLS assert failed: merchant updated platform_role';
exception
  when insufficient_privilege then
    null;
end
$fn$;

-- Staff of store A cannot change the store, its subscription, or its members.
select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', true);
select set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"33333333-3333-4333-8333-333333333333"}',
  true
);

do $fn$
declare
  n integer;
begin
  update public.stores set name = 'staff rename' where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  get diagnostics n = row_count;
  if n <> 0 then
    raise exception 'RLS assert failed: staff updated the store';
  end if;
  update public.subscriptions set plan_id = 'pro' where store_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  get diagnostics n = row_count;
  if n <> 0 then
    raise exception 'RLS assert failed: staff updated the subscription';
  end if;
  delete from public.store_members where user_id = '11111111-1111-4111-8111-111111111111';
  get diagnostics n = row_count;
  if n <> 0 then
    raise exception 'RLS assert failed: staff deleted a member';
  end if;
end
$fn$;

do $fn$
begin
  insert into storage.objects (bucket_id, name)
  values ('store-media', 'stores/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/hack.png');
  raise exception 'RLS assert failed: staff inserted media for another store';
exception
  when insufficient_privilege then
    null;
end
$fn$;

insert into storage.objects (bucket_id, name)
values ('store-media', 'stores/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/staff.png');

-- Back to the table owner: confirm denied writes did not change rows.
reset role;
reset session authorization;

do $fn$
begin
  if (select name from public.products where id = 'b1111111-1111-4111-8111-111111111111') <> 'Public B' then
    raise exception 'RLS assert failed: store B product was renamed';
  end if;
  if (select count(*) from public.analytics_events where event_type::text = 'whatsapp_click') <> 1 then
    raise exception 'RLS assert failed: valid analytics insert was not stored';
  end if;
  if (select count(*) from public.support_messages where sender = 'system') <> 0 then
    raise exception 'RLS assert failed: a system support row was stored';
  end if;
  if (select count(*) from public.referrals) <> 0 then
    raise exception 'RLS assert failed: a referral row was stored';
  end if;
end
$fn$;

-- Owner A can update their store. Column grant is widened only for the trigger check.

grant update (platform_role, suspended_at) on public.profiles to authenticated;

set session authorization authenticator;
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"11111111-1111-4111-8111-111111111111"}',
  true
);

update public.profiles
  set platform_role = 'admin', suspended_at = now(), full_name = 'Owner A'
  where id = '11111111-1111-4111-8111-111111111111';

select public._rls_expect(
  (
    select platform_role::text = 'merchant' and suspended_at is null and full_name = 'Owner A'
    from public.profiles
    where id = '11111111-1111-4111-8111-111111111111'
  ),
  'profile trigger should keep platform_role and suspended_at'
);

update public.stores
  set name = 'Store A renamed'
  where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

select public._rls_expect(
  (
    select name = 'Store A renamed'
    from public.stores
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  ),
  'owner should update their store'
);

do $fn$
declare
  n integer;
begin
  update public.stores set owner_id = '22222222-2222-4222-8222-222222222222'
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  raise exception 'RLS assert failed: owner_id change was accepted';
exception
  when others then
    if sqlerrm ilike '%RLS assert failed%' then
      raise;
    end if;
    get diagnostics n = row_count;
end
$fn$;

select public._rls_expect(
  (
    select owner_id = '11111111-1111-4111-8111-111111111111'
    from public.stores
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  ),
  'owner_id should stay with merchant A'
);

-- Service role can mint a referral code. Merchants cannot write the ledger.
reset role;
reset session authorization;
set role service_role;

select public._rls_expect(
  char_length(public.ensure_referral_code('11111111-1111-4111-8111-111111111111'::uuid)) between 16 and 64,
  'service role should create a referral code'
);

select public._rls_expect(
  (select count(*) = 1 from public.referral_audit_log where event_type = 'code_created'),
  'service role should write the referral audit log'
);

reset role;

rollback;
