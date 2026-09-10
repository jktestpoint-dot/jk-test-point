-- Secure, additive foundation for future server-side payment processing.
-- No payment, entitlement, question, or existing user data is created here.

create table if not exists public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'razorpay' check (char_length(trim(provider)) > 0),
  provider_order_id text unique,
  provider_payment_id text unique,
  product_type text not null check (char_length(trim(product_type)) > 0),
  product_id text not null check (char_length(trim(product_id)) > 0),
  amount_paise integer not null check (amount_paise > 0),
  currency text not null default 'INR' check (currency = 'INR'),
  status text not null default 'created' check (status in ('created', 'paid', 'failed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create index if not exists payment_orders_user_id_idx
  on public.payment_orders (user_id);
create index if not exists payment_orders_user_product_idx
  on public.payment_orders (user_id, product_type, product_id);

create table if not exists public.subject_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null check (char_length(trim(subject)) > 0),
  payment_order_id uuid,
  status text not null default 'active' check (status in ('active', 'revoked')),
  granted_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subject_entitlements_payment_order_owner_fkey
    foreign key (payment_order_id, user_id)
    references public.payment_orders (id, user_id)
    on delete restrict
);

create index if not exists subject_entitlements_user_subject_idx
  on public.subject_entitlements (user_id, subject);
create unique index if not exists subject_entitlements_one_active_subject_idx
  on public.subject_entitlements (user_id, subject)
  where status = 'active';

create or replace function public.set_payment_access_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_payment_orders_updated_at on public.payment_orders;
create trigger set_payment_orders_updated_at
before update on public.payment_orders
for each row execute function public.set_payment_access_updated_at();

drop trigger if exists set_subject_entitlements_updated_at on public.subject_entitlements;
create trigger set_subject_entitlements_updated_at
before update on public.subject_entitlements
for each row execute function public.set_payment_access_updated_at();

alter table public.payment_orders enable row level security;
revoke all on table public.payment_orders from public, anon, authenticated;
grant select on table public.payment_orders to authenticated;
drop policy if exists "Users can read their own payment orders" on public.payment_orders;
create policy "Users can read their own payment orders"
on public.payment_orders
for select to authenticated
using (user_id = auth.uid());

alter table public.subject_entitlements enable row level security;
revoke all on table public.subject_entitlements from public, anon, authenticated;
grant select on table public.subject_entitlements to authenticated;
drop policy if exists "Users can read their own subject entitlements" on public.subject_entitlements;
create policy "Users can read their own subject entitlements"
on public.subject_entitlements
for select to authenticated
using (user_id = auth.uid());
