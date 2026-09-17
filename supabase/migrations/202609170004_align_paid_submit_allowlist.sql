-- Align paid subject submission validation with the canonical catalogue.
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
  if auth.uid() is null then
    raise exception 'Please log in before submitting practice';
  end if;

  if p_subject not in ('accountancy', 'mathematics', 'statistics', 'economics', 'computer', 'jk-gk', 'general-knowledge', 'reasoning', 'english', 'general-science', 'indian-polity', 'history', 'geography', 'environment', 'indian-economy') then
    raise exception 'Invalid subject';
  end if;

  if not exists (
    select 1
    from public.subject_entitlements e
    where e.user_id = auth.uid()
      and e.subject = p_subject
      and e.status = 'active'
  ) then
    raise exception 'Purchase is required to submit this subject';
  end if;

  if jsonb_typeof(p_answers) <> 'array' then
    raise exception 'Answers must be an array';
  end if;

  select count(*) into actual_count
  from public."SUBJECT_MCQ_QUESTIONS" where subject = p_subject;
  if actual_count = 0 then
    raise exception 'This subject is not ready yet. Questions are still being added.';
  end if;

  select count(*) into correct_count
  from public."SUBJECT_MCQ_QUESTIONS" q
  where q.subject = p_subject and exists (
    select 1 from jsonb_array_elements(p_answers) a
    where a->>'question_id' = q.id::text and a->>'selected_option' = q.correct_option
  );

  select count(*) into incorrect_count
  from public."SUBJECT_MCQ_QUESTIONS" q
  where q.subject = p_subject and exists (
    select 1 from jsonb_array_elements(p_answers) a
    where a->>'question_id' = q.id::text
      and coalesce(a->>'selected_option', '') <> ''
      and a->>'selected_option' <> q.correct_option
  );

  select coalesce(jsonb_agg(jsonb_build_object(
    'question_id', q.id, 'selected_option', answer.selected_option
  ) order by q.question_number), '[]'::jsonb) into submitted_answers
  from public."SUBJECT_MCQ_QUESTIONS" q
  left join lateral (
    select nullif(a->>'selected_option', '') as selected_option
    from jsonb_array_elements(p_answers) a
    where a->>'question_id' = q.id::text limit 1
  ) answer on true
  where q.subject = p_subject;

  select coalesce(jsonb_agg(jsonb_build_object(
    'question_id', q.id,
    'question_number', q.question_number,
    'question_text', q.question_text,
    'selected_option', answer.selected_option,
    'selected_answer', case answer.selected_option
      when 'A' then q.option_a when 'B' then q.option_b
      when 'C' then q.option_c when 'D' then q.option_d else null end,
    'correct_option', q.correct_option,
    'correct_answer', case q.correct_option
      when 'A' then q.option_a when 'B' then q.option_b
      when 'C' then q.option_c when 'D' then q.option_d end,
    'status', case
      when answer.selected_option is null then 'unattempted'
      when answer.selected_option = q.correct_option then 'correct'
      else 'incorrect' end,
    'explanation', q.explanation
  ) order by q.question_number), '[]'::jsonb) into question_review
  from public."SUBJECT_MCQ_QUESTIONS" q
  left join lateral (
    select nullif(a->>'selected_option', '') as selected_option
    from jsonb_array_elements(p_answers) a
    where a->>'question_id' = q.id::text limit 1
  ) answer on true
  where q.subject = p_subject;

  insert into public."SUBJECT_MCQ_ATTEMPTS" (
    user_id, subject, score, percentage, total_questions, correct,
    incorrect, unattempted, answers, review
  ) values (
    auth.uid(), p_subject, correct_count,
    round((correct_count::numeric / actual_count) * 100, 2),
    actual_count, correct_count, incorrect_count,
    actual_count - correct_count - incorrect_count,
    submitted_answers, question_review
  ) returning id into attempt_id;

  return jsonb_build_object(
    'attempt_id', attempt_id,
    'score', correct_count,
    'percentage', round((correct_count::numeric / actual_count) * 100, 2),
    'question_count', actual_count,
    'correct', correct_count,
    'incorrect', incorrect_count,
    'unattempted', actual_count - correct_count - incorrect_count,
    'review', question_review
  );
end;
$$;

revoke execute on function public.submit_subject_mcq_attempt(text, jsonb)
  from public, anon;
grant execute on function public.submit_subject_mcq_attempt(text, jsonb)
  to authenticated;
