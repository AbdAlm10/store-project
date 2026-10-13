-- Paste once in the Supabase SQL editor. Safe to run again.
-- Signup inserts the profile with no end-user jwt (auth.uid() is null).

create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if auth.uid() is null
     or coalesce(auth.role(), '') = 'service_role'
     or session_user in ('postgres', 'supabase_auth_admin', 'supabase_admin', 'service_role')
  then
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
