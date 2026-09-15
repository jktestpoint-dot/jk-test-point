-- Restrict paid mock questions to the purchasing user while preserving
-- anonymous reads for explicitly free/published mock tests.
drop policy if exists "Published test questions are readable without answers"
  on public."TEST_QUESTIONS";

create policy "Published mock questions require access"
on public."TEST_QUESTIONS"
for select
to anon, authenticated
using (
  exists (
    select 1
    from public."MOCK_TESTS" t
    where t.id = test_id
      and t.published is true
      and (
        coalesce(t.price, 0) = 0
        or (
          auth.uid() is not null
          and (
            exists (
              select 1
              from public.payment_orders o
              where o.user_id = auth.uid()
                and o.provider = 'razorpay'
                and o.product_type = 'mock_test'
                and o.product_id = t.id
                and o.status = 'paid'
                and o.currency = 'INR'
            )
            or exists (
              select 1
              from public.subject_entitlements e
              where e.user_id = auth.uid()
                and e.subject = 'mock:' || t.id
                and e.status = 'active'
                and (e.expires_at is null or e.expires_at > now())
            )
          )
        )
      )
  )
);
