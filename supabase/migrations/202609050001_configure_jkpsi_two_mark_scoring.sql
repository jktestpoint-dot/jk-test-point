-- Scoped configuration for JKPSI Mock 01. Existing tests retain the default
-- one-mark scoring rule; no question content is changed.
alter table public."MOCK_TESTS"
  add column if not exists marks_per_question integer not null default 1
  check (marks_per_question > 0);

alter table public."TEST_ATTEMPTS"
  add column if not exists total_marks integer;

update public."MOCK_TESTS"
set
  question_count = 100,
  duration_minutes = 100,
  marks_per_question = 2,
  total_marks = 200
where id = 'jkpsi-paid-01';

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
  set question_count = supplied_count,
      duration_minutes = supplied_count,
      total_marks = supplied_count * marks_per_question
  where id = p_test_id;

  return jsonb_build_object('imported', supplied_count, 'question_count', supplied_count, 'duration_minutes', supplied_count);
end;
$$;

create or replace function public.submit_mock_test_attempt(p_test_id text, p_answers jsonb)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  actual_count integer;
  correct_count integer;
  incorrect_count integer;
  earned_score integer;
  maximum_marks integer;
  configured_marks_per_question integer;
  percentage numeric;
  test_name text;
  submitted_answers jsonb;
  question_review jsonb;
  attempt_id uuid;
begin
  if auth.uid() is null then raise exception 'Please log in before submitting a test'; end if;
  if jsonb_typeof(p_answers) <> 'array' then raise exception 'Answers must be an array'; end if;

  select title, total_marks, marks_per_question
  into test_name, maximum_marks, configured_marks_per_question
  from public."MOCK_TESTS" where id = p_test_id and published;
  if test_name is null then raise exception 'Test not found'; end if;

  select count(*) into actual_count from public."TEST_QUESTIONS" where test_id = p_test_id;
  if actual_count = 0 then raise exception 'This test is not ready yet. Questions are still being added.'; end if;

  select count(*) into correct_count from public."TEST_QUESTIONS" q
  where q.test_id = p_test_id and exists (
    select 1 from jsonb_array_elements(p_answers) a
    where a->>'question_id' = q.id::text and a->>'selected_option' = q.correct_option
  );

  select count(*) into incorrect_count from public."TEST_QUESTIONS" q
  where q.test_id = p_test_id and exists (
    select 1 from jsonb_array_elements(p_answers) a
    where a->>'question_id' = q.id::text
      and coalesce(a->>'selected_option', '') <> ''
      and a->>'selected_option' <> q.correct_option
  );

  earned_score := correct_count * configured_marks_per_question;
  percentage := round((earned_score::numeric / maximum_marks) * 100, 2);

  select coalesce(jsonb_agg(jsonb_build_object(
    'question_id', q.id,
    'selected_option', answer.selected_option
  ) order by q.question_number), '[]'::jsonb)
  into submitted_answers
  from public."TEST_QUESTIONS" q
  left join lateral (
    select nullif(a->>'selected_option', '') as selected_option
    from jsonb_array_elements(p_answers) a
    where a->>'question_id' = q.id::text
    limit 1
  ) answer on true
  where q.test_id = p_test_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'question_id', q.id,
    'question_number', q.question_number,
    'question_text', q.question_text,
    'selected_option', answer.selected_option,
    'selected_answer', case answer.selected_option
      when 'A' then q.option_a when 'B' then q.option_b when 'C' then q.option_c when 'D' then q.option_d
      else null end,
    'correct_option', q.correct_option,
    'correct_answer', case q.correct_option
      when 'A' then q.option_a when 'B' then q.option_b when 'C' then q.option_c when 'D' then q.option_d end,
    'status', case
      when answer.selected_option is null then 'unattempted'
      when answer.selected_option = q.correct_option then 'correct'
      else 'incorrect' end,
    'explanation', q.explanation
  ) order by q.question_number), '[]'::jsonb)
  into question_review
  from public."TEST_QUESTIONS" q
  left join lateral (
    select nullif(a->>'selected_option', '') as selected_option
    from jsonb_array_elements(p_answers) a
    where a->>'question_id' = q.id::text
    limit 1
  ) answer on true
  where q.test_id = p_test_id;

  insert into public."TEST_ATTEMPTS" (user_id, test_id, test_title, score, percentage, answers, review, total_marks)
  values (auth.uid(), p_test_id, test_name, earned_score, percentage, submitted_answers, question_review, maximum_marks)
  returning id into attempt_id;

  return jsonb_build_object(
    'attempt_id', attempt_id,
    'score', earned_score,
    'total_marks', maximum_marks,
    'percentage', percentage,
    'correct', correct_count,
    'incorrect', incorrect_count,
    'unattempted', actual_count - correct_count - incorrect_count,
    'question_count', actual_count,
    'review', question_review
  );
end;
$$;

grant execute on function public.replace_test_questions(text, jsonb) to authenticated;
grant execute on function public.submit_mock_test_attempt(text, jsonb) to authenticated;
