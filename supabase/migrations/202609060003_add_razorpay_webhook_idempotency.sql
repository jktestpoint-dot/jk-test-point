-- Database-backed idempotency for signed Razorpay payment.captured webhooks.
-- Existing payment orders, entitlements, and subject data are not modified here.

create table if not exists public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider = 'razorpay'),
  provider_event_id text not null check (char_length(trim(provider_event_id)) > 0),
  event_type text not null check (event_type = 'payment.captured'),
  provider_order_id text not null check (char_length(trim(provider_order_id)) > 0),
  provider_payment_id text not null check (char_length(trim(provider_payment_id)) > 0),
  status text not null check (status in ('processing', 'processed')),
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_webhook_events_provider_event_unique unique (provider, provider_event_id),
  constraint payment_webhook_events_provider_payment_unique unique (provider, event_type, provider_payment_id)
);

create index if not exists payment_webhook_events_provider_order_idx
  on public.payment_webhook_events (provider, provider_order_id);

drop trigger if exists set_payment_webhook_events_updated_at on public.payment_webhook_events;
create trigger set_payment_webhook_events_updated_at
before update on public.payment_webhook_events
for each row execute function public.set_payment_access_updated_at();

alter table public.payment_webhook_events enable row level security;
revoke all on table public.payment_webhook_events from public, anon, authenticated;

create or replace function public.process_razorpay_payment_captured_webhook(
  p_provider_event_id text,
  p_provider_order_id text,
  p_provider_payment_id text,
  p_amount_paise integer,
  p_currency text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
  v_event_status text;
  v_order public.payment_orders%rowtype;
  v_completion jsonb;
begin
  if coalesce(nullif(trim(p_provider_event_id), ''), '') = ''
    or coalesce(nullif(trim(p_provider_order_id), ''), '') = ''
    or coalesce(nullif(trim(p_provider_payment_id), ''), '') = ''
    or p_amount_paise is null
    or p_amount_paise <= 0
    or p_currency <> 'INR' then
    raise exception 'Invalid Razorpay webhook payload';
  end if;

  insert into public.payment_webhook_events (
    provider,
    provider_event_id,
    event_type,
    provider_order_id,
    provider_payment_id,
    status
  )
  values (
    'razorpay',
    p_provider_event_id,
    'payment.captured',
    p_provider_order_id,
    p_provider_payment_id,
    'processing'
  )
  -- Either Razorpay's event ID or the captured payment ID can identify a replay.
  -- Do not let a second unique constraint turn a harmless duplicate into a new
  -- payment-completion attempt.
  on conflict do nothing
  returning id into v_event_id;

  if v_event_id is null then
    select status into v_event_status
    from public.payment_webhook_events
    where provider = 'razorpay'
      and (
        provider_event_id = p_provider_event_id
        or (
          event_type = 'payment.captured'
          and provider_payment_id = p_provider_payment_id
        )
      )
    limit 1;

    if v_event_status = 'processed' then
      return jsonb_build_object('already_processed', true);
    end if;

    raise exception 'Razorpay webhook event is not processable';
  end if;

  select * into v_order
  from public.payment_orders
  where provider = 'razorpay'
    and provider_order_id = p_provider_order_id
  for update;

  if not found then
    raise exception 'Unknown Razorpay payment order';
  end if;

  if v_order.product_type <> 'subject_mcq'
    or coalesce(nullif(trim(v_order.product_id), ''), '') = ''
    or v_order.amount_paise <> p_amount_paise
    or v_order.currency <> p_currency
    or v_order.currency <> 'INR' then
    raise exception 'Razorpay webhook does not match the stored payment order';
  end if;

  select public.complete_subject_payment_order(
    v_order.user_id,
    p_provider_order_id,
    p_provider_payment_id
  ) into v_completion;

  update public.payment_webhook_events
  set status = 'processed', processed_at = now()
  where id = v_event_id;

  return v_completion || jsonb_build_object('already_processed', false);
end;
$$;

revoke all on function public.process_razorpay_payment_captured_webhook(text, text, text, integer, text)
  from public, anon, authenticated;
grant execute on function public.process_razorpay_payment_captured_webhook(text, text, text, integer, text)
  to service_role;
