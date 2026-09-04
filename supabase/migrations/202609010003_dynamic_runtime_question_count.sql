-- Runtime scoring is based on the questions actually stored for the requested test.
create or replace function public.submit_mock_test_attempt(p_test_id text, p_answers jsonb)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  actual_count integer;
  correct_count integer;
  incorrect_count integer;
  percentage numeric;
  test_name text;
begin
  if auth.uid() is null then raise exception 'Please log in before submitting a test'; end if;
  if jsonb_typeof(p_answers) <> 'array' then raise exception 'Answers must be an array'; end if;

  select title into test_name from public."MOCK_TESTS" where id = p_test_id and published;
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

  percentage := round((correct_count::numeric / actual_count) * 100, 2);
  insert into public."TEST_ATTEMPTS" (user_id, test_id, test_title, score, percentage)
  values (auth.uid(), p_test_id, test_name, correct_count, percentage);

  return jsonb_build_object(
    'score', correct_count,
    'percentage', percentage,
    'correct', correct_count,
    'incorrect', incorrect_count,
    'unattempted', actual_count - correct_count - incorrect_count,
    'question_count', actual_count
  );
end;
$$;

grant execute on function public.submit_mock_test_attempt(text, jsonb) to authenticated;
