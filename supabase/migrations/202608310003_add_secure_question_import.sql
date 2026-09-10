-- Secure, normalized question storage for bulk imports. Existing mock-test
-- metadata and test attempts are preserved unchanged.
create table if not exists public."ADMINS" (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Bootstrap the project owner's existing authenticated account when present.
insert into public."ADMINS" (user_id)
select id from auth.users where lower(email) = lower('syedsajid34@gmail.com')
on conflict (user_id) do nothing;

alter table public."ADMINS" enable row level security;
create policy "Admins can view their own admin record" on public."ADMINS"
  for select to authenticated using (user_id = auth.uid());

create or replace function public.is_jk_test_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public."ADMINS" where user_id = auth.uid()); $$;
grant execute on function public.is_jk_test_admin() to authenticated;

create table if not exists public."TEST_QUESTIONS" (
  id uuid primary key default gen_random_uuid(),
  test_id text not null references public."MOCK_TESTS"(id) on delete cascade,
  question_number integer not null check (question_number > 0),
  question_text text not null check (char_length(trim(question_text)) > 0),
  option_a text not null check (char_length(trim(option_a)) > 0),
  option_b text not null check (char_length(trim(option_b)) > 0),
  option_c text not null check (char_length(trim(option_c)) > 0),
  option_d text not null check (char_length(trim(option_d)) > 0),
  correct_option char(1) not null check (correct_option in ('A','B','C','D')),
  explanation text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (test_id, question_number)
);
create index if not exists test_questions_test_id_idx on public."TEST_QUESTIONS" (test_id);
create index if not exists test_questions_test_number_idx on public."TEST_QUESTIONS" (test_id, question_number);

alter table public."TEST_QUESTIONS" enable row level security;
revoke all on public."TEST_QUESTIONS" from anon, authenticated;
grant select (id, test_id, question_number, question_text, option_a, option_b, option_c, option_d, explanation) on public."TEST_QUESTIONS" to anon, authenticated;
create policy "Published test questions are readable without answers" on public."TEST_QUESTIONS"
  for select to anon, authenticated using (exists (select 1 from public."MOCK_TESTS" t where t.id = test_id and t.published));

create or replace function public.replace_test_questions(p_test_id text, p_questions jsonb)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare required_count integer; supplied_count integer;
begin
  if not public.is_jk_test_admin() then raise exception 'Administrator access is required'; end if;
  select question_count into required_count from public."MOCK_TESTS" where id = p_test_id;
  if required_count is null then raise exception 'Selected test does not exist'; end if;
  if jsonb_typeof(p_questions) <> 'array' then raise exception 'Questions must be an array'; end if;
  supplied_count := jsonb_array_length(p_questions);
  if supplied_count > required_count then raise exception 'File contains % questions, but this test requires only %', supplied_count, required_count; end if;
  if exists (select 1 from jsonb_array_elements(p_questions) q where jsonb_typeof(q) <> 'object' or (q->>'question_number') !~ '^[1-9][0-9]*$' or coalesce(nullif(trim(q->>'question_text'), ''), '') = '' or coalesce(nullif(trim(q->>'option_a'), ''), '') = '' or coalesce(nullif(trim(q->>'option_b'), ''), '') = '' or coalesce(nullif(trim(q->>'option_c'), ''), '') = '' or coalesce(nullif(trim(q->>'option_d'), ''), '') = '' or q->>'correct_option' not in ('A','B','C','D')) then raise exception 'One or more question rows are malformed'; end if;
  if (select count(*) from (select q->>'question_number' n from jsonb_array_elements(p_questions) q group by q->>'question_number' having count(*) > 1) duplicates) > 0 then raise exception 'Duplicate question numbers found'; end if;
  delete from public."TEST_QUESTIONS" where test_id = p_test_id;
  insert into public."TEST_QUESTIONS" (test_id, question_number, question_text, option_a, option_b, option_c, option_d, correct_option, explanation)
  select p_test_id, (q->>'question_number')::integer, q->>'question_text', q->>'option_a', q->>'option_b', q->>'option_c', q->>'option_d', q->>'correct_option', nullif(q->>'explanation','') from jsonb_array_elements(p_questions) q;
  return jsonb_build_object('imported', supplied_count, 'required', required_count, 'complete', supplied_count = required_count);
end;
$$;
grant execute on function public.replace_test_questions(text, jsonb) to authenticated;

create or replace function public.submit_mock_test_attempt(p_test_id text, p_answers jsonb)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare required_count integer; actual_count integer; total_score integer; percentage numeric; test_name text;
begin
  if auth.uid() is null then raise exception 'Please log in before submitting a test'; end if;
  select title, question_count into test_name, required_count from public."MOCK_TESTS" where id = p_test_id and published;
  if required_count is null then raise exception 'Test not found'; end if;
  select count(*) into actual_count from public."TEST_QUESTIONS" where test_id = p_test_id;
  if actual_count <> required_count then raise exception 'This test is not ready yet. Questions are still being added.'; end if;
  select count(*) into total_score from public."TEST_QUESTIONS" q join jsonb_array_elements(p_answers) a on a->>'question_id' = q.id::text where q.test_id = p_test_id and a->>'selected_option' = q.correct_option;
  percentage := round((total_score::numeric / required_count) * 100, 2);
  insert into public."TEST_ATTEMPTS" (user_id, test_id, test_title, score, percentage) values (auth.uid(), p_test_id, test_name, total_score, percentage);
  return jsonb_build_object('score', total_score, 'percentage', percentage);
end;
$$;
grant execute on function public.submit_mock_test_attempt(text, jsonb) to authenticated;
