-- Support chat messages from merchants (dashboard widget).
-- Apply in Supabase SQL Editor if migrations folder is managed manually.

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  store_id uuid references public.stores (id) on delete set null,
  sender text not null check (sender in ('user', 'system')),
  body text not null check (char_length(trim(body)) > 0 and char_length(body) <= 2000),
  created_at timestamptz not null default now()
);

alter table public.support_messages drop constraint if exists support_messages_sender_check;
alter table public.support_messages
  add constraint support_messages_sender_check
  check (sender in ('user', 'system'));

alter table public.support_messages drop constraint if exists support_messages_body_check;
alter table public.support_messages
  add constraint support_messages_body_check
  check (char_length(trim(body)) > 0 and char_length(body) <= 2000);

drop index if exists public.support_messages_user_created_idx;
create index support_messages_user_created_idx
  on public.support_messages (user_id, created_at desc);

drop index if exists public.support_messages_created_idx;
create index support_messages_created_idx
  on public.support_messages (created_at desc);

alter table public.support_messages enable row level security;

do $fn$
declare
  policy_name text;
begin
  for policy_name in
    select pol.policyname
    from pg_policies pol
    where pol.schemaname = 'public'
      and pol.tablename = 'support_messages'
  loop
    execute format('drop policy if exists %I on public.support_messages', policy_name);
  end loop;
end
$fn$;

-- Merchants can insert their own user messages.
drop policy if exists "support_messages_insert_own" on public.support_messages;
create policy "support_messages_insert_own"
  on public.support_messages
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and sender = 'user'
  );

-- Merchants can read their own thread (user + system replies).
drop policy if exists "support_messages_select_own" on public.support_messages;
create policy "support_messages_select_own"
  on public.support_messages
  for select
  to authenticated
  using (auth.uid() = user_id);

-- System auto-replies are inserted by the same authenticated user row
-- (sender = 'system') via a dedicated policy so the widget can persist them.
drop policy if exists "support_messages_insert_system_own" on public.support_messages;
create policy "support_messages_insert_system_own"
  on public.support_messages
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and sender = 'system'
  );

comment on table public.support_messages is
  'Merchant support chat messages from the dashboard floating widget.';
