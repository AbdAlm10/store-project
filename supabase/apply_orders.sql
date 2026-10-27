-- Smart order: one row per WhatsApp cart, numbered D-1001 upward per store.
-- Paste this once in the Supabase SQL editor after apply_free_tier.sql.
-- Idempotent. It does not change existing products, stores, or plans.
-- Do not run it on production until it has been reviewed.
--
-- Anon and signed-in shoppers may call place_store_order. They cannot read
-- orders. Store members can select their store's orders. The function checks
-- that each product belongs to the store and is visible, prices the lines
-- itself, and gives the store the next number under a row lock.

begin;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  order_number integer not null,
  customer_name text not null,
  governorate text not null,
  address text,
  notes text,
  payment_method text not null,
  currency text not null,
  total numeric not null,
  items jsonb not null,
  visitor_key text,
  created_at timestamptz not null default now(),
  constraint orders_store_number_key unique (store_id, order_number)
);

alter table public.orders add column if not exists customer_name text;
alter table public.orders add column if not exists governorate text;
alter table public.orders add column if not exists address text;
alter table public.orders add column if not exists notes text;
alter table public.orders add column if not exists payment_method text;
alter table public.orders add column if not exists currency text;
alter table public.orders add column if not exists total numeric;
alter table public.orders add column if not exists items jsonb;
alter table public.orders add column if not exists visitor_key text;
alter table public.orders add column if not exists created_at timestamptz not null default now();

alter table public.orders drop constraint if exists orders_payment_check;
alter table public.orders
  add constraint orders_payment_check
  check (payment_method in ('cash', 'shamcash', 'transfer'));

alter table public.orders drop constraint if exists orders_total_check;
alter table public.orders
  add constraint orders_total_check
  check (total >= 0);

alter table public.orders drop constraint if exists orders_items_array_check;
alter table public.orders
  add constraint orders_items_array_check
  check (jsonb_typeof(items) = 'array');

create table if not exists public.store_order_counters (
  store_id uuid primary key references public.stores (id) on delete cascade,
  last_number integer not null
);

create table if not exists public.order_rate_buckets (
  store_id uuid not null references public.stores (id) on delete cascade,
  bucket_key text not null,
  window_start timestamptz not null,
  hits integer not null,
  primary key (store_id, bucket_key, window_start)
);

alter table public.analytics_events drop constraint if exists analytics_events_type_check;
alter table public.analytics_events
  add constraint analytics_events_type_check
  check (event_type::text in (
    'store_view', 'product_view', 'whatsapp_click', 'share', 'search', 'qr_scan', 'order'
  ));

create or replace function public.place_store_order(
  p_store_id uuid,
  p_items jsonb,
  p_customer jsonb,
  p_fingerprint text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_name text;
  v_governorate text;
  v_address text;
  v_notes text;
  v_payment text;
  v_fingerprint text;
  v_window timestamptz;
  v_hits integer;
  v_element jsonb;
  v_product_id uuid;
  v_options jsonb;
  v_qty integer;
  v_client numeric;
  v_product public.products%rowtype;
  v_variant_price numeric;
  v_variant_stock integer;
  v_unit numeric;
  v_stock integer;
  v_currency text;
  v_items jsonb := '[]'::jsonb;
  v_removed jsonb := '[]'::jsonb;
  v_changes jsonb := '[]'::jsonb;
  v_total numeric := 0;
  v_number integer;
  v_slug text;
  v_seen integer := 0;
  v_governorates text[] := array[
    'دمشق', 'ريف دمشق', 'حلب', 'حمص', 'حماة', 'اللاذقية', 'طرطوس',
    'إدلب', 'درعا', 'السويداء', 'القنيطرة', 'دير الزور', 'الرقة', 'الحسكة'
  ];
begin
  if not exists (select 1 from public.stores s where s.id = p_store_id) then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;
  if jsonb_typeof(p_items) is distinct from 'array'
     or jsonb_array_length(p_items) < 1
     or jsonb_array_length(p_items) > 30
     or jsonb_typeof(p_customer) is distinct from 'object' then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  v_name := left(btrim(coalesce(p_customer->>'name', '')), 80);
  v_governorate := btrim(coalesce(p_customer->>'governorate', ''));
  v_address := nullif(left(btrim(coalesce(p_customer->>'address', '')), 200), '');
  v_notes := nullif(left(btrim(coalesce(p_customer->>'notes', '')), 400), '');
  v_payment := p_customer->>'payment';
  if char_length(v_name) < 2
     or v_governorate <> all (v_governorates)
     or v_payment not in ('cash', 'shamcash', 'transfer') then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  v_fingerprint := left(coalesce(nullif(btrim(p_fingerprint), ''), 'anon'), 80);
  v_window := date_trunc('hour', now());

  insert into public.order_rate_buckets as b (store_id, bucket_key, window_start, hits)
  values (p_store_id, 'fp:' || v_fingerprint, v_window, 1)
  on conflict (store_id, bucket_key, window_start)
  do update set hits = b.hits + 1
  returning hits into v_hits;
  if v_hits > 8 then
    return jsonb_build_object('ok', false, 'reason', 'rate_limited');
  end if;

  insert into public.order_rate_buckets as b (store_id, bucket_key, window_start, hits)
  values (p_store_id, 'store', v_window, 1)
  on conflict (store_id, bucket_key, window_start)
  do update set hits = b.hits + 1
  returning hits into v_hits;
  if v_hits > 40 then
    return jsonb_build_object('ok', false, 'reason', 'rate_limited');
  end if;

  for v_element in select value from jsonb_array_elements(p_items)
  loop
    v_seen := v_seen + 1;
    if v_seen > 30 then
      exit;
    end if;

    begin
      v_product_id := (v_element->>'productId')::uuid;
      v_qty := least(99, greatest(1, coalesce((v_element->>'quantity')::integer, 1)));
      v_options := coalesce(v_element->'options', '{}'::jsonb);
      if jsonb_typeof(v_options) is distinct from 'object' then
        v_options := '{}'::jsonb;
      end if;
      v_client := nullif(v_element->>'clientUnitPrice', '')::numeric;
    exception
      when others then
        v_removed := v_removed || jsonb_build_array(
          jsonb_build_object('productId', coalesce(v_element->>'productId', ''), 'name', coalesce(v_element->>'name', ''))
        );
        continue;
    end;

    select * into v_product
    from public.products p
    where p.id = v_product_id
      and p.store_id = p_store_id
      and p.status::text = 'published';

    if not found
       or not (
         public.is_store_member(p_store_id)
         or public.product_visible_to_public(v_product.id)
       ) then
      v_removed := v_removed || jsonb_build_array(
        jsonb_build_object('productId', v_product_id, 'name', coalesce(v_element->>'name', ''))
      );
      continue;
    end if;

    v_unit := v_product.price;
    v_stock := v_product.stock;
    v_variant_price := null;
    v_variant_stock := null;

    if exists (
      select 1
      from public.product_variants v
      where v.product_id = v_product.id
        and v.options <> '{}'::jsonb
    ) and v_options = '{}'::jsonb then
      v_removed := v_removed || jsonb_build_array(
        jsonb_build_object('productId', v_product.id, 'name', v_product.name)
      );
      continue;
    end if;

    if v_options <> '{}'::jsonb then
      select v.price, v.stock
        into v_variant_price, v_variant_stock
      from public.product_variants v
      where v.product_id = v_product.id
        and v.store_id = p_store_id
        and v.options = v_options
      limit 1;
      if not found then
        v_removed := v_removed || jsonb_build_array(
          jsonb_build_object('productId', v_product.id, 'name', v_product.name)
        );
        continue;
      end if;
      if v_variant_price is not null then
        v_unit := v_variant_price;
      end if;
      if v_variant_stock is not null then
        v_stock := v_variant_stock;
      end if;
    end if;

    if v_stock is not null and v_stock <= 0 then
      v_removed := v_removed || jsonb_build_array(
        jsonb_build_object('productId', v_product.id, 'name', v_product.name)
      );
      continue;
    end if;

    if v_currency is null then
      v_currency := v_product.currency::text;
    elsif v_product.currency::text is distinct from v_currency then
      v_removed := v_removed || jsonb_build_array(
        jsonb_build_object('productId', v_product.id, 'name', v_product.name)
      );
      continue;
    end if;

    if v_client is not null and abs(v_client - v_unit) > 0.009 then
      v_changes := v_changes || jsonb_build_array(jsonb_build_object(
        'productId', v_product.id,
        'name', v_product.name,
        'from', v_client,
        'to', v_unit
      ));
    end if;

    v_total := v_total + (v_unit * v_qty);
    v_items := v_items || jsonb_build_array(jsonb_build_object(
      'productId', v_product.id,
      'name', v_product.name,
      'options', v_options,
      'quantity', v_qty,
      'unitPrice', v_unit,
      'lineTotal', v_unit * v_qty
    ));
  end loop;

  if jsonb_array_length(v_items) = 0 then
    return jsonb_build_object('ok', false, 'reason', 'empty', 'removed', v_removed);
  end if;

  insert into public.store_order_counters as c (store_id, last_number)
  values (p_store_id, 1001)
  on conflict (store_id) do update
  set last_number = c.last_number + 1
  returning last_number into v_number;

  insert into public.orders (
    store_id, order_number, customer_name, governorate, address, notes,
    payment_method, currency, total, items, visitor_key
  ) values (
    p_store_id, v_number, v_name, v_governorate, v_address, v_notes,
    v_payment, v_currency, v_total, v_items, v_fingerprint
  );

  select s.slug into v_slug from public.stores s where s.id = p_store_id;
  begin
    insert into public.analytics_events (store_id, event_type, source, path, visitor_key, metadata)
    values (
      p_store_id,
      'order',
      'cart',
      '/' || coalesce(v_slug, ''),
      v_fingerprint,
      jsonb_build_object('orderNumber', v_number, 'total', v_total, 'currency', v_currency)
    );
  exception
    when others then
      null;
  end;

  return jsonb_build_object(
    'ok', true,
    'code', 'D-' || v_number::text,
    'orderNumber', v_number,
    'currency', v_currency,
    'total', v_total,
    'items', v_items,
    'removed', v_removed,
    'priceChanges', v_changes
  );
end;
$fn$;

revoke all on function public.place_store_order(uuid, jsonb, jsonb, text) from public;
grant execute on function public.place_store_order(uuid, jsonb, jsonb, text) to anon, authenticated;

alter table public.orders enable row level security;
alter table public.store_order_counters enable row level security;
alter table public.order_rate_buckets enable row level security;

revoke all on public.orders from anon, authenticated;
revoke all on public.store_order_counters from anon, authenticated;
revoke all on public.order_rate_buckets from anon, authenticated;
grant select on public.orders to authenticated;

drop policy if exists orders_select_member on public.orders;
create policy orders_select_member
  on public.orders for select to authenticated
  using (public.is_store_member(store_id));

commit;
