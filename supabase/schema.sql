-- Profiles (optional but useful)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz default now()
);

-- Customer mapping
create table if not exists public.customers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text unique
);

-- Subscription status (entitlements)
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_subscription_id text unique,
  status text,
  current_period_end timestamptz,
  updated_at timestamptz default now()
);

-- RLS
alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.subscriptions enable row level security;

-- Profiles: user can read/write their own
create policy "profiles_select_own"
on public.profiles for select
to authenticated
using (id = auth.uid());

create policy "profiles_insert_own"
on public.profiles for insert
to authenticated
with check (id = auth.uid());

create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (id = auth.uid());

-- Customers: user can read their own (writes happen via service role in webhook/action)
create policy "customers_select_own"
on public.customers for select
to authenticated
using (user_id = auth.uid());

-- Subscriptions: user can read their own
create policy "subs_select_own"
on public.subscriptions for select
to authenticated
using (user_id = auth.uid());
