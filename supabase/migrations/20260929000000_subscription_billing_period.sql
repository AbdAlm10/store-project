alter table public.subscriptions
  add column if not exists billing_period text not null default 'monthly';

alter table public.subscriptions
  drop constraint if exists subscriptions_billing_period_check;

alter table public.subscriptions
  add constraint subscriptions_billing_period_check
  check (billing_period in ('monthly', 'yearly'));