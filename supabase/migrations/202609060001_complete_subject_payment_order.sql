-- Atomic server-only completion for a Razorpay subject-MCQ payment.
-- The caller is the application server using the Supabase service_role key.

create or replace function public.complete_subject_payment_order(
  p_user_id uuid,
  p_provider_order_id text,
  p_provider_payment_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.payment_orders%rowtype;
  v_entitlement_id uuid;
  v_already_processed boolean := false;
begin
  if p_user_id is null or coalesce(nullif(trim(p_provider_order_id), ''), '') = '' or coalesce(nullif(trim(p_provider_payment_id), ''), '') = '' then
    raise exception 'Invalid payment completion request';
  end if;

  select * into v_order
  from public.payment_orders
  where provider = 'razorpay' and provider_order_id = p_provider_order_id
  for update;

  if not found then
    raise exception 'Unknown payment order';
  end if;
  if v_order.user_id <> p_user_id then
    raise exception 'Payment order does not belong to this user' using errcode = '42501';
  end if;
  if v_order.product_type <> 'subject_mcq' or coalesce(nullif(trim(v_order.product_id), ''), '') = '' or v_order.amount_paise <= 0 or v_order.currency <> 'INR' then
    raise exception 'Payment order has invalid product metadata';
  end if;

  if v_order.status = 'paid' then
    if v_order.provider_payment_id is distinct from p_provider_payment_id then
      raise exception 'Payment order was already completed with a different payment';
    end if;
    v_already_processed := true;
  elsif v_order.status = 'created' then
    update public.payment_orders
    set status = 'paid', provider_payment_id = p_provider_payment_id
    where id = v_order.id;
  else
    raise exception 'Payment order cannot be completed from status %', v_order.status;
  end if;

  insert into public.subject_entitlements (user_id, subject, payment_order_id, status)
  values (v_order.user_id, v_order.product_id, v_order.id, 'active')
  on conflict (user_id, subject) where status = 'active' do nothing
  returning id into v_entitlement_id;

  if v_entitlement_id is null then
    select id into v_entitlement_id
    from public.subject_entitlements
    where user_id = v_order.user_id and subject = v_order.product_id and status = 'active'
    limit 1;
  end if;

  return jsonb_build_object(
    'subject', v_order.product_id,
    'amount_paise', v_order.amount_paise,
    'status', 'paid',
    'already_processed', v_already_processed,
    'entitlement_id', v_entitlement_id
  );
end;
$$;

revoke all on function public.complete_subject_payment_order(uuid, text, text) from public, anon, authenticated;
grant execute on function public.complete_subject_payment_order(uuid, text, text) to service_role;
