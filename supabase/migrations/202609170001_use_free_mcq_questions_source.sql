-- Repoint Free MCQ question reads/scoring to the dedicated free question source.
-- Paid subject tables and RPCs are intentionally unchanged.

-- Return only the safe student-facing columns for active free mappings. The
-- correct_option remains private to the server-side RPC and is never
-- returned from this function.
create or replace function public.get_free_subject_mcq_questions(p_subject text)
returns table (
  id uuid,
  subject text,
  question_number integer,
  question_text text,
  option_a text,
  option_b text,
  option_c text,
  option_d text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Please log in to access free practice';
  end if;

  if coalesce(nullif(trim(p_subject), ''), '') = '' then
    raise exception 'Invalid subject';
  end if;

  return query
  select
    q.id,
    q.subject,
    q.question_number,
    q.question_text,
    q.option_a,
    q.option_b,
    q.option_c,
    q.option_d
  from public."FREE_MCQ_QUESTIONS" q
  where q.subject = p_subject
    and true
  order by q.question_number, q.question_number, q.id;
end;
$$;

revoke execute on function public.get_free_subject_mcq_questions(text)
  from public, anon;
grant execute on function public.get_free_subject_mcq_questions(text)
  to authenticated;

-- Score only active mapped free questions. Correct answers and review data are
-- produced server-side and are returned only after a submitted attempt.
create or replace function public.submit_free_subject_mcq_attempt(
  p_subject text,
  p_answers jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total integer;
  v_correct integer;
  v_incorrect integer;
  v_attempt_id uuid;
  v_answers jsonb;
  v_review jsonb;
begin
  if auth.uid() is null then
    raise exception 'Please log in before submitting free practice';
  end if;

  if coalesce(nullif(trim(p_subject), ''), '') = '' then
    raise exception 'Invalid subject';
  end if;

  if jsonb_typeof(p_answers) <> 'array' then
    raise exception 'Answers must be an array';
  end if;

  select count(*)
  into v_total
  from public."FREE_MCQ_QUESTIONS" q
  where q.subject = p_subject
    and true;

  if v_total = 0 then
    raise exception 'No free questions are available for this subject';
  end if;

  select count(*)
  into v_correct
  from public."FREE_MCQ_QUESTIONS" q
  where q.subject = p_subject
    and exists (
      select 1
      from jsonb_array_elements(p_answers) a
      where a->>'question_id' = q.id::text
        and a->>'selected_option' = q.correct_option
    );

  select count(*)
  into v_incorrect
  from public."FREE_MCQ_QUESTIONS" q
  where q.subject = p_subject
    and exists (
      select 1
      from jsonb_array_elements(p_answers) a
      where a->>'question_id' = q.id::text
        and coalesce(a->>'selected_option', '') <> ''
        and a->>'selected_option' <> q.correct_option
    );

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'question_id', q.id,
        'selected_option', answer.selected_option
      )
      order by q.question_number, q.question_number, q.id
    ),
    '[]'::jsonb
  )
  into v_answers
  from public."FREE_MCQ_QUESTIONS" q
  left join lateral (
    select nullif(a->>'selected_option', '') as selected_option
    from jsonb_array_elements(p_answers) a
    where a->>'question_id' = q.id::text
    limit 1
  ) answer on true
  where q.subject = p_subject
    and true;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'question_id', q.id,
        'question_number', q.question_number,
        'question_text', q.question_text,
        'selected_option', answer.selected_option,
        'selected_answer', case answer.selected_option
          when 'A' then q.option_a
          when 'B' then q.option_b
          when 'C' then q.option_c
          when 'D' then q.option_d
          else null
        end,
        'correct_option', q.correct_option,
        'correct_answer', case q.correct_option
          when 'A' then q.option_a
          when 'B' then q.option_b
          when 'C' then q.option_c
          when 'D' then q.option_d
        end,
        'status', case
          when answer.selected_option is null then 'unattempted'
          when answer.selected_option = q.correct_option then 'correct'
          else 'incorrect'
        end,
        'explanation', q.explanation
      )
      order by q.question_number, q.question_number, q.id
    ),
    '[]'::jsonb
  )
  into v_review
  from public."FREE_MCQ_QUESTIONS" q
  left join lateral (
    select nullif(a->>'selected_option', '') as selected_option
    from jsonb_array_elements(p_answers) a
    where a->>'question_id' = q.id::text
    limit 1
  ) answer on true
  where q.subject = p_subject
    and true;

  insert into public."FREE_SUBJECT_MCQ_ATTEMPTS" (
    user_id,
    subject,
    score,
    percentage,
    total_questions,
    correct,
    incorrect,
    unattempted,
    answers,
    review
  )
  values (
    auth.uid(),
    p_subject,
    v_correct,
    round((v_correct::numeric / v_total) * 100, 2),
    v_total,
    v_correct,
    v_incorrect,
    v_total - v_correct - v_incorrect,
    v_answers,
    v_review
  )
  returning id into v_attempt_id;

  return jsonb_build_object(
    'attempt_id', v_attempt_id,
    'score', v_correct,
    'percentage', round((v_correct::numeric / v_total) * 100, 2),
    'question_count', v_total,
    'correct', v_correct,
    'incorrect', v_incorrect,
    'unattempted', v_total - v_correct - v_incorrect,
    'review', v_review
  );
end;
$$;

revoke execute on function public.submit_free_subject_mcq_attempt(text, jsonb)
  from public, anon;
grant execute on function public.submit_free_subject_mcq_attempt(text, jsonb)
  to authenticated;



