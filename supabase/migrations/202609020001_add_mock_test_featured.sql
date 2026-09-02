-- Explicit, administrator-managed homepage selection for published mock tests.
alter table public."MOCK_TESTS"
  add column if not exists featured boolean not null default false;

create index if not exists mock_tests_featured_idx
  on public."MOCK_TESTS" (created_at desc)
  where published = true and featured = true;

create or replace function public.set_mock_test_featured(p_test_id text, p_featured boolean)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_jk_test_admin() then
    raise exception 'Administrator access is required';
  end if;

  update public."MOCK_TESTS"
  set featured = p_featured
  where id = p_test_id and published = true;

  if not found then
    raise exception 'Published test not found';
  end if;
end;
$$;

revoke all on function public.set_mock_test_featured(text, boolean) from public;
grant execute on function public.set_mock_test_featured(text, boolean) to authenticated;
