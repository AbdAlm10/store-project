-- System support replies are written with the service role.
-- Authenticated users may insert only sender = 'user'.
-- The block uses a named dollar tag so the SQL editor keeps it in one piece.

do $fn$
begin
  if to_regclass('public.support_messages') is null then
    return;
  end if;
  execute 'drop policy if exists "support_messages_insert_system_own" on public.support_messages';
end $fn$;
