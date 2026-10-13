-- Block store creation until the owner's email is confirmed.
-- Google sign-in counts as verified. Idempotent. Does not recreate enums
-- and does not change plan limits.
-- Paste after supabase/apply_live.sql. Run again if apply_live.sql is applied
-- later, because that script recreates stores_insert_own without this check.
-- The trigger remains even if the policy is replaced.

begin;

create or replace function public.is_email_verified(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select exists (
    select 1
    from auth.users u
    where u.id = target_user
      and (
        u.email_confirmed_at is not null
        or coalesce(u.raw_app_meta_data->>'provider', '') = 'google'
        or exists (
          select 1
          from auth.identities i
          where i.user_id = u.id
            and i.provider = 'google'
        )
      )
  );
$fn$;

revoke all on function public.is_email_verified(uuid) from public;
grant execute on function public.is_email_verified(uuid) to authenticated;

create or replace function public.reject_unverified_store_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  -- Migrations and the service role have no end-user jwt.
  if auth.uid() is null then
    return new;
  end if;
  if not public.is_email_verified(new.owner_id) then
    raise exception 'email not confirmed' using errcode = '42501';
  end if;
  return new;
end;
$fn$;

drop trigger if exists stores_require_confirmed_email on public.stores;
create trigger stores_require_confirmed_email
  before insert on public.stores
  for each row
  execute function public.reject_unverified_store_insert();

drop policy if exists stores_insert_own on public.stores;
create policy stores_insert_own
  on public.stores for insert to authenticated
  with check (
    owner_id = auth.uid()
    and public.is_email_verified(auth.uid())
  );

commit;
