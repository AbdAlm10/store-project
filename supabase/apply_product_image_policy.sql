-- Fixes "infinite recursion detected in policy for relation product_images".
-- The free-tier SELECT policy read product_images from inside itself, so a
-- member could not save an image (insert ... returning) and the storefront
-- could not read images. Paste this once in the Supabase SQL editor, as the
-- postgres role, after apply_free_tier.sql. Idempotent. It replaces only
-- primary_product_image_id and the product_images_select policy.
--
-- Run this on a copy of the schema first. It does not change plans, rows, or
-- any other policy.

begin;

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

commit;
