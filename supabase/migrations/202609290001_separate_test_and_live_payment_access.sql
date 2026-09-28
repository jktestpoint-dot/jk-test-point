-- Keep payment environment provenance explicit. Existing rows remain NULL
-- (unverified legacy) and are deliberately not classified or deleted.

alter table public.payment_orders
  add column if not exists payment_mode text;
alter table public.subject_entitlements
  add column if not exists payment_mode text;
alter table public.payment_webhook_events
  add column if not exists payment_mode text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'payment_orders_payment_mode_check') then
    alter table public.payment_orders add constraint payment_orders_payment_mode_check
      check (payment_mode is null or payment_mode in ('test', 'live'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'subject_entitlements_payment_mode_check') then
    alter table public.subject_entitlements add constraint subject_entitlements_payment_mode_check
      check (payment_mode is null or payment_mode in ('test', 'live'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'payment_webhook_events_payment_mode_check') then
    alter table public.payment_webhook_events add constraint payment_webhook_events_payment_mode_check
      check (payment_mode is null or payment_mode in ('test', 'live'));
  end if;
end;
$$;

drop index if exists public.subject_entitlements_one_active_subject_idx;
create unique index if not exists subject_entitlements_one_active_subject_mode_idx
  on public.subject_entitlements (user_id, subject, payment_mode)
  where status = 'active' and payment_mode in ('test', 'live');

drop trigger if exists set_subject_entitlement_payment_mode on public.subject_entitlements;
create or replace function public.set_subject_entitlement_payment_mode()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mode text;
  v_status text;
begin
  if new.payment_order_id is null then
    new.payment_mode := null;
    if new.status = 'active' then new.status := 'revoked'; end if;
    return new;
  end if;

  select payment_mode, status into v_mode, v_status
  from public.payment_orders
  where id = new.payment_order_id and user_id = new.user_id;
  if not found then raise exception 'Entitlement payment order does not belong to this user'; end if;

  new.payment_mode := v_mode;
  if v_mode is null or v_status <> 'paid' or (v_mode = 'test' and new.status = 'active') then
    new.status := 'revoked';
  end if;
  return new;
end;
$$;
create trigger set_subject_entitlement_payment_mode
before insert or update
on public.subject_entitlements
for each row execute function public.set_subject_entitlement_payment_mode();

-- Legacy/null and TEST rows remain stored, but are no longer directly visible
-- as purchases through authenticated PostgREST access.
drop policy if exists "Users can read their own payment orders" on public.payment_orders;
create policy "Users can read their own live payment orders"
on public.payment_orders for select to authenticated
using (user_id = auth.uid() and payment_mode = 'live');

drop policy if exists "Users can read their own subject entitlements" on public.subject_entitlements;
create policy "Users can read their own live subject entitlements"
on public.subject_entitlements for select to authenticated
using (user_id = auth.uid() and payment_mode = 'live');

-- Only a mode-matched server-verified payment can become an entitlement.
revoke all on function public.process_razorpay_payment_captured_webhook(text, text, text, integer, text) from public, anon, authenticated, service_role;
drop function if exists public.process_razorpay_payment_captured_webhook(text, text, text, integer, text);
revoke all on function public.complete_subject_payment_order(uuid, text, text) from public, anon, authenticated, service_role;
drop function if exists public.complete_subject_payment_order(uuid, text, text);
revoke all on function public.complete_mock_payment_order(uuid, text, text) from public, anon, authenticated, service_role;
drop function if exists public.complete_mock_payment_order(uuid, text, text);

create or replace function public.complete_subject_payment_order(
  p_user_id uuid, p_provider_order_id text, p_provider_payment_id text, p_payment_mode text
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
  if p_payment_mode is null or p_payment_mode not in ('test', 'live') or p_user_id is null
    or coalesce(nullif(trim(p_provider_order_id), ''), '') = ''
    or coalesce(nullif(trim(p_provider_payment_id), ''), '') = '' then
    raise exception 'Invalid payment completion request';
  end if;
  select * into v_order from public.payment_orders
  where provider = 'razorpay' and provider_order_id = p_provider_order_id for update;
  if not found then raise exception 'Unknown payment order'; end if;
  if v_order.user_id <> p_user_id then raise exception 'Payment order does not belong to this user' using errcode = '42501'; end if;
  if v_order.payment_mode is distinct from p_payment_mode then raise exception 'Payment mode does not match stored order'; end if;
  if v_order.product_type <> 'subject_mcq' or coalesce(nullif(trim(v_order.product_id), ''), '') = ''
    or v_order.amount_paise <= 0 or v_order.currency <> 'INR' then
    raise exception 'Payment order has invalid product metadata';
  end if;

  if v_order.status = 'paid' then
    if v_order.provider_payment_id is distinct from p_provider_payment_id then
      raise exception 'Payment order was already completed with a different payment';
    end if;
    v_already_processed := true;
  elsif v_order.status = 'created' then
    update public.payment_orders set status = 'paid', provider_payment_id = p_provider_payment_id where id = v_order.id;
  else
    raise exception 'Payment order cannot be completed from status %', v_order.status;
  end if;

  select id into v_entitlement_id from public.subject_entitlements
  where user_id = v_order.user_id and subject = v_order.product_id
    and payment_order_id = v_order.id and payment_mode = p_payment_mode limit 1;
  if v_entitlement_id is null then
    insert into public.subject_entitlements (user_id, subject, payment_order_id, payment_mode, status)
    values (v_order.user_id, v_order.product_id, v_order.id, p_payment_mode,
      case when p_payment_mode = 'live' then 'active' else 'revoked' end)
    on conflict do nothing returning id into v_entitlement_id;
  end if;
  if v_entitlement_id is null and p_payment_mode = 'live' then
    select id into v_entitlement_id from public.subject_entitlements
    where user_id = v_order.user_id and subject = v_order.product_id
      and payment_mode = 'live' and status = 'active' limit 1;
  end if;

  return jsonb_build_object('subject', v_order.product_id, 'amount_paise', v_order.amount_paise,
    'status', 'paid', 'payment_mode', p_payment_mode, 'already_processed', v_already_processed,
    'entitlement_id', v_entitlement_id);
end;
$$;
revoke all on function public.complete_subject_payment_order(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.complete_subject_payment_order(uuid, text, text, text) to service_role;

create or replace function public.complete_mock_payment_order(
  p_user_id uuid, p_provider_order_id text, p_provider_payment_id text, p_payment_mode text
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
  if p_payment_mode is null or p_payment_mode not in ('test', 'live') or p_user_id is null
    or coalesce(nullif(trim(p_provider_order_id), ''), '') = ''
    or coalesce(nullif(trim(p_provider_payment_id), ''), '') = '' then
    raise exception 'Invalid payment completion request';
  end if;
  select * into v_order from public.payment_orders
  where provider = 'razorpay' and provider_order_id = p_provider_order_id for update;
  if not found then raise exception 'Unknown payment order'; end if;
  if v_order.user_id <> p_user_id then raise exception 'Payment order does not belong to this user' using errcode = '42501'; end if;
  if v_order.payment_mode is distinct from p_payment_mode then raise exception 'Payment mode does not match stored order'; end if;
  if v_order.product_type <> 'mock_test' or coalesce(nullif(trim(v_order.product_id), ''), '') = ''
    or v_order.amount_paise <= 0 or v_order.currency <> 'INR' then raise exception 'Payment order has invalid product metadata'; end if;

  if v_order.status = 'paid' then
    if v_order.provider_payment_id is distinct from p_provider_payment_id then raise exception 'Payment order was already completed with a different payment'; end if;
    v_already_processed := true;
  elsif v_order.status = 'created' then
    update public.payment_orders set status = 'paid', provider_payment_id = p_provider_payment_id where id = v_order.id;
  else raise exception 'Payment order cannot be completed from status %', v_order.status;
  end if;

  select id into v_entitlement_id from public.subject_entitlements
  where user_id = v_order.user_id and subject = 'mock:' || v_order.product_id
    and payment_order_id = v_order.id and payment_mode = p_payment_mode limit 1;
  if v_entitlement_id is null then
    insert into public.subject_entitlements (user_id, subject, payment_order_id, payment_mode, status)
    values (v_order.user_id, 'mock:' || v_order.product_id, v_order.id, p_payment_mode,
      case when p_payment_mode = 'live' then 'active' else 'revoked' end)
    on conflict do nothing returning id into v_entitlement_id;
  end if;
  if v_entitlement_id is null and p_payment_mode = 'live' then
    select id into v_entitlement_id from public.subject_entitlements
    where user_id = v_order.user_id and subject = 'mock:' || v_order.product_id
      and payment_mode = 'live' and status = 'active' limit 1;
  end if;
  return jsonb_build_object('subject', v_order.product_id, 'amount_paise', v_order.amount_paise,
    'status', 'paid', 'payment_mode', p_payment_mode, 'already_processed', v_already_processed,
    'entitlement_id', v_entitlement_id);
end;
$$;
revoke all on function public.complete_mock_payment_order(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.complete_mock_payment_order(uuid, text, text, text) to service_role;

-- Scope webhook idempotency to the verified Razorpay mode as well.
alter table public.payment_webhook_events drop constraint if exists payment_webhook_events_provider_event_unique;
alter table public.payment_webhook_events drop constraint if exists payment_webhook_events_provider_payment_unique;
create unique index if not exists payment_webhook_events_mode_event_unique
  on public.payment_webhook_events (provider, payment_mode, provider_event_id)
  where payment_mode in ('test', 'live');
create unique index if not exists payment_webhook_events_mode_payment_unique
  on public.payment_webhook_events (provider, payment_mode, event_type, provider_payment_id)
  where payment_mode in ('test', 'live');

create or replace function public.process_razorpay_payment_captured_webhook(
  p_provider_event_id text, p_provider_order_id text, p_provider_payment_id text,
  p_amount_paise integer, p_currency text, p_payment_mode text
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
  if p_payment_mode is null or p_payment_mode not in ('test', 'live') or coalesce(nullif(trim(p_provider_event_id), ''), '') = ''
    or coalesce(nullif(trim(p_provider_order_id), ''), '') = ''
    or coalesce(nullif(trim(p_provider_payment_id), ''), '') = ''
    or p_amount_paise is null or p_amount_paise <= 0 or p_currency <> 'INR' then
    raise exception 'Invalid Razorpay webhook payload';
  end if;

  insert into public.payment_webhook_events
    (provider, provider_event_id, event_type, provider_order_id, provider_payment_id, status, payment_mode)
  values ('razorpay', p_provider_event_id, 'payment.captured', p_provider_order_id,
    p_provider_payment_id, 'processing', p_payment_mode)
  on conflict do nothing returning id into v_event_id;
  if v_event_id is null then
    select status into v_event_status from public.payment_webhook_events
    where provider = 'razorpay' and payment_mode = p_payment_mode
      and (provider_event_id = p_provider_event_id or
        (event_type = 'payment.captured' and provider_payment_id = p_provider_payment_id)) limit 1;
    if v_event_status = 'processed' then return jsonb_build_object('already_processed', true); end if;
    raise exception 'Razorpay webhook event is not processable';
  end if;

  select * into v_order from public.payment_orders
  where provider = 'razorpay' and provider_order_id = p_provider_order_id for update;
  if not found or v_order.payment_mode is distinct from p_payment_mode then raise exception 'Unknown payment order for this mode'; end if;
  if v_order.product_type not in ('subject_mcq', 'mock_test') or coalesce(nullif(trim(v_order.product_id), ''), '') = ''
    or v_order.amount_paise <> p_amount_paise or v_order.currency <> p_currency or p_currency <> 'INR' then
    raise exception 'Razorpay webhook does not match the stored payment order';
  end if;
  if v_order.product_type = 'mock_test' then
    select public.complete_mock_payment_order(v_order.user_id, p_provider_order_id, p_provider_payment_id, p_payment_mode) into v_completion;
  else
    select public.complete_subject_payment_order(v_order.user_id, p_provider_order_id, p_provider_payment_id, p_payment_mode) into v_completion;
  end if;
  update public.payment_webhook_events set status = 'processed', processed_at = now() where id = v_event_id;
  return v_completion || jsonb_build_object('already_processed', false);
end;
$$;
revoke all on function public.process_razorpay_payment_captured_webhook(text, text, text, integer, text, text) from public, anon, authenticated;
grant execute on function public.process_razorpay_payment_captured_webhook(text, text, text, integer, text, text) to service_role;

-- A paid subject question can only be read when both the linked entitlement
-- and its completed order are verified LIVE records.
drop policy if exists "Entitled users can read their subject MCQ questions" on public."SUBJECT_MCQ_QUESTIONS";
create policy "Verified live purchasers can read subject MCQ questions"
on public."SUBJECT_MCQ_QUESTIONS" for select to authenticated
using (
  exists (
    select 1 from public.subject_entitlements e
    join public.payment_orders o on o.id = e.payment_order_id and o.user_id = e.user_id
    where e.user_id = auth.uid() and e.subject = "SUBJECT_MCQ_QUESTIONS".subject
      and e.status = 'active' and e.payment_mode = 'live'
      and o.payment_mode = 'live' and o.status = 'paid'
      and o.product_type = 'subject_mcq' and o.product_id = e.subject and o.currency = 'INR'
  )
);

-- The SECURITY DEFINER scorer must enforce the same live entitlement boundary.
create or replace function public.submit_subject_mcq_attempt(p_subject text, p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actual_count integer;
  correct_count integer;
  incorrect_count integer;
  attempt_id uuid;
  submitted_answers jsonb;
  question_review jsonb;
begin
  if auth.uid() is null then raise exception 'Please log in before submitting practice'; end if;
  if p_subject not in ('accountancy', 'mathematics', 'statistics', 'economics', 'computer', 'jk-gk', 'general-knowledge', 'reasoning', 'english', 'general-science', 'indian-polity', 'history', 'geography', 'environment', 'indian-economy') then raise exception 'Invalid subject'; end if;
  if not exists (
    select 1 from public.subject_entitlements e
    join public.payment_orders o on o.id = e.payment_order_id and o.user_id = e.user_id
    where e.user_id = auth.uid() and e.subject = p_subject and e.status = 'active'
      and e.payment_mode = 'live' and o.payment_mode = 'live' and o.status = 'paid'
      and o.product_type = 'subject_mcq' and o.product_id = p_subject and o.currency = 'INR'
  ) then raise exception 'Purchase is required to submit this subject'; end if;
  if jsonb_typeof(p_answers) <> 'array' then raise exception 'Answers must be an array'; end if;

  select count(*) into actual_count from public."SUBJECT_MCQ_QUESTIONS" where subject = p_subject;
  if actual_count = 0 then raise exception 'This subject is not ready yet. Questions are still being added.'; end if;
  select count(*) into correct_count from public."SUBJECT_MCQ_QUESTIONS" q
    where q.subject = p_subject and exists (select 1 from jsonb_array_elements(p_answers) a where a->>'question_id' = q.id::text and a->>'selected_option' = q.correct_option);
  select count(*) into incorrect_count from public."SUBJECT_MCQ_QUESTIONS" q
    where q.subject = p_subject and exists (select 1 from jsonb_array_elements(p_answers) a where a->>'question_id' = q.id::text and coalesce(a->>'selected_option', '') <> '' and a->>'selected_option' <> q.correct_option);

  select coalesce(jsonb_agg(jsonb_build_object('question_id', q.id, 'selected_option', answer.selected_option) order by q.question_number), '[]'::jsonb)
    into submitted_answers from public."SUBJECT_MCQ_QUESTIONS" q
    left join lateral (select nullif(a->>'selected_option', '') as selected_option from jsonb_array_elements(p_answers) a where a->>'question_id' = q.id::text limit 1) answer on true
    where q.subject = p_subject;
  select coalesce(jsonb_agg(jsonb_build_object(
    'question_id', q.id, 'question_number', q.question_number, 'question_text', q.question_text,
    'selected_option', answer.selected_option,
    'selected_answer', case answer.selected_option when 'A' then q.option_a when 'B' then q.option_b when 'C' then q.option_c when 'D' then q.option_d else null end,
    'correct_option', q.correct_option,
    'correct_answer', case q.correct_option when 'A' then q.option_a when 'B' then q.option_b when 'C' then q.option_c when 'D' then q.option_d end,
    'status', case when answer.selected_option is null then 'unattempted' when answer.selected_option = q.correct_option then 'correct' else 'incorrect' end,
    'explanation', q.explanation
  ) order by q.question_number), '[]'::jsonb) into question_review
    from public."SUBJECT_MCQ_QUESTIONS" q
    left join lateral (select nullif(a->>'selected_option', '') as selected_option from jsonb_array_elements(p_answers) a where a->>'question_id' = q.id::text limit 1) answer on true
    where q.subject = p_subject;

  insert into public."SUBJECT_MCQ_ATTEMPTS" (user_id, subject, score, percentage, total_questions, correct, incorrect, unattempted, answers, review)
  values (auth.uid(), p_subject, correct_count, round((correct_count::numeric / actual_count) * 100, 2), actual_count, correct_count, incorrect_count, actual_count - correct_count - incorrect_count, submitted_answers, question_review)
  returning id into attempt_id;
  return jsonb_build_object('attempt_id', attempt_id, 'score', correct_count,
    'percentage', round((correct_count::numeric / actual_count) * 100, 2), 'question_count', actual_count,
    'correct', correct_count, 'incorrect', incorrect_count, 'unattempted', actual_count - correct_count - incorrect_count,
    'review', question_review);
end;
$$;
revoke execute on function public.submit_subject_mcq_attempt(text, jsonb) from public, anon;
grant execute on function public.submit_subject_mcq_attempt(text, jsonb) to authenticated;

-- Paid mock question RLS requires a LIVE paid order and its matching LIVE
-- entitlement; free published mock behavior remains unchanged.
drop policy if exists "Published mock questions require access" on public."TEST_QUESTIONS";
create policy "Published mock questions require access"
on public."TEST_QUESTIONS" for select to anon, authenticated
using (
  exists (
    select 1 from public."MOCK_TESTS" t
    where t.id = test_id and t.published is true
      and (coalesce(t.price, 0) = 0 or (
        auth.uid() is not null and exists (
          select 1 from public.payment_orders o
          join public.subject_entitlements e on e.payment_order_id = o.id and e.user_id = o.user_id
          where o.user_id = auth.uid() and o.provider = 'razorpay' and o.product_type = 'mock_test'
            and o.product_id = t.id and o.status = 'paid' and o.payment_mode = 'live' and o.currency = 'INR'
            and e.subject = 'mock:' || t.id and e.status = 'active' and e.payment_mode = 'live'
            and (e.expires_at is null or e.expires_at > now())
        )
      ))
  )
);
