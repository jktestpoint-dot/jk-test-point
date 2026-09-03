-- Keep legacy MOCK_TESTS metadata compatible while deriving it from the
-- question bank. This migration is additive/non-destructive: no tests or
-- question rows are deleted.
alter table public."MOCK_TESTS"
  drop constraint if exists "MOCK_TESTS_question_count_check";

alter table public."MOCK_TESTS"
  add constraint "MOCK_TESTS_question_count_check" check (question_count >= 0);

alter table public."MOCK_TESTS"
  drop constraint if exists "MOCK_TESTS_duration_minutes_check";

alter table public."MOCK_TESTS"
  add constraint "MOCK_TESTS_duration_minutes_check" check (duration_minutes >= 0);

update public."MOCK_TESTS" test
set
  question_count = counts.question_count,
  duration_minutes = counts.question_count,
  total_marks = counts.question_count
from (
  select test_row.id, count(question.id)::integer as question_count
  from public."MOCK_TESTS" test_row
  left join public."TEST_QUESTIONS" question on question.test_id = test_row.id
  group by test_row.id
) counts
where test.id = counts.id
  and (
    test.question_count is distinct from counts.question_count
    or test.duration_minutes is distinct from counts.question_count
    or test.total_marks is distinct from counts.question_count
  );

create or replace function public.replace_test_questions(p_test_id text, p_questions jsonb)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare supplied_count integer;
begin
  if not public.is_jk_test_admin() then raise exception 'Administrator access is required'; end if;
  if not exists (select 1 from public."MOCK_TESTS" where id = p_test_id) then raise exception 'Selected test does not exist'; end if;
  if jsonb_typeof(p_questions) <> 'array' then raise exception 'Questions must be an array'; end if;
  supplied_count := jsonb_array_length(p_questions);
  if supplied_count = 0 then raise exception 'Import contains no questions'; end if;
  if exists (select 1 from jsonb_array_elements(p_questions) q where jsonb_typeof(q) <> 'object' or (q->>'question_number') !~ '^[1-9][0-9]*$' or coalesce(nullif(trim(q->>'question_text'), ''), '') = '' or coalesce(nullif(trim(q->>'option_a'), ''), '') = '' or coalesce(nullif(trim(q->>'option_b'), ''), '') = '' or coalesce(nullif(trim(q->>'option_c'), ''), '') = '' or coalesce(nullif(trim(q->>'option_d'), ''), '') = '' or q->>'correct_option' not in ('A','B','C','D')) then raise exception 'One or more question rows are malformed'; end if;
  if exists (select 1 from (select q->>'question_number' n from jsonb_array_elements(p_questions) q group by q->>'question_number' having count(*) > 1) d) then raise exception 'Duplicate question numbers found'; end if;

  delete from public."TEST_QUESTIONS" where test_id = p_test_id;
  insert into public."TEST_QUESTIONS" (test_id, question_number, question_text, option_a, option_b, option_c, option_d, correct_option, explanation)
  select p_test_id, (q->>'question_number')::integer, q->>'question_text', q->>'option_a', q->>'option_b', q->>'option_c', q->>'option_d', q->>'correct_option', nullif(q->>'explanation','') from jsonb_array_elements(p_questions) q;

  update public."MOCK_TESTS"
  set question_count = supplied_count, duration_minutes = supplied_count, total_marks = supplied_count
  where id = p_test_id;

  return jsonb_build_object('imported', supplied_count, 'question_count', supplied_count, 'duration_minutes', supplied_count);
end;
$$;

grant execute on function public.replace_test_questions(text, jsonb) to authenticated;
