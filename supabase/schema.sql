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

-- Backup targets for the app
create table if not exists public.backup_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  working_path text not null,
  backup_path text not null,
  last_synced_at timestamptz,
  status text default 'unknown',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.backup_targets enable row level security;

create policy "backup_targets_select_own"
on public.backup_targets for select
to authenticated
using (user_id = auth.uid());

create policy "backup_targets_insert_own"
on public.backup_targets for insert
to authenticated
with check (user_id = auth.uid());

create policy "backup_targets_update_own"
on public.backup_targets for update
to authenticated
using (user_id = auth.uid());

create policy "backup_targets_delete_own"
on public.backup_targets for delete
to authenticated
using (user_id = auth.uid());

-- Health log entries (written by agent via service key/API)
create table if not exists public.backup_health_log (
  id uuid primary key default gen_random_uuid(),
  target_id uuid references public.backup_targets(id) on delete cascade,
  status text,
  notes text,
  metrics jsonb,
  created_at timestamptz default now()
);

alter table public.backup_health_log enable row level security;

create policy "backup_health_log_select_own"
on public.backup_health_log for select
to authenticated
using (
  target_id in (
    select id from public.backup_targets where user_id = auth.uid()
  )
);
