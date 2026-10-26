-- Option-group cap for Basic and trial. Not applied to production.
-- Paste after supabase/apply_free_tier.sql. Safe to run again. Does not delete rows.
-- maxOptionsPerProduct in src/config/plans.ts counts option groups (json keys
-- such as لون and مقاس), not variant combinations. Free still rejects every
-- variant row. Pro stays unlimited. Re-pasting apply_free_tier.sql restores
-- the older rule that allowed any non-free variant; paste this file again after that.

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
    if v_plan not in ('basic', 'trial') then
      return new;
    end if;
    select count(*) into v_count
    from (
      select distinct btrim(key) as key
      from (
        select jsonb_object_keys(coalesce(pv.options, '{}'::jsonb)) as key
        from public.product_variants pv
        where pv.product_id = new.product_id
        union all
        select jsonb_object_keys(coalesce(new.options, '{}'::jsonb))
      ) raw
    ) named
    where key <> '';
    if v_count > 3 then
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
