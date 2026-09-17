-- Allow the newly catalogued Indian Economy subject in the existing paid
-- subject question importer without changing any other subject behavior.
alter table public."SUBJECT_MCQ_QUESTIONS"
  drop constraint if exists subject_mcq_questions_subject_allowed_check;

alter table public."SUBJECT_MCQ_QUESTIONS"
  add constraint subject_mcq_questions_subject_allowed_check
  check (subject in ('accountancy', 'mathematics', 'statistics', 'economics', 'computer', 'indian-economy'));

create or replace function public.replace_subject_mcq_questions(p_subject text, p_questions jsonb)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare supplied_count integer;
begin
  if not public.is_jk_test_admin() then raise exception 'Administrator access is required'; end if;
  if p_subject not in ('accountancy', 'mathematics', 'statistics', 'economics', 'computer', 'indian-economy') then raise exception 'Invalid subject'; end if;
  if jsonb_typeof(p_questions) <> 'array' then raise exception 'Questions must be an array'; end if;
  supplied_count := jsonb_array_length(p_questions);
  if supplied_count = 0 then raise exception 'At least one question is required'; end if;
  if exists (select 1 from jsonb_array_elements(p_questions) q where jsonb_typeof(q) <> 'object' or (q->>'question_number') !~ '^[1-9][0-9]*$' or coalesce(nullif(trim(q->>'question_text'), ''), '') = '' or coalesce(nullif(trim(q->>'option_a'), ''), '') = '' or coalesce(nullif(trim(q->>'option_b'), ''), '') = '' or coalesce(nullif(trim(q->>'option_c'), ''), '') = '' or coalesce(nullif(trim(q->>'option_d'), ''), '') = '' or q->>'correct_option' not in ('A', 'B', 'C', 'D')) then raise exception 'One or more question rows are malformed'; end if;
  if exists (select 1 from (select q->>'question_number' from jsonb_array_elements(p_questions) q group by q->>'question_number' having count(*) > 1) duplicates) then raise exception 'Duplicate question numbers found'; end if;
  delete from public."SUBJECT_MCQ_QUESTIONS" where subject = p_subject;
  insert into public."SUBJECT_MCQ_QUESTIONS" (subject, question_number, question_text, option_a, option_b, option_c, option_d, correct_option, explanation)
  select p_subject, (q->>'question_number')::integer, q->>'question_text', q->>'option_a', q->>'option_b', q->>'option_c', q->>'option_d', q->>'correct_option', nullif(q->>'explanation', '') from jsonb_array_elements(p_questions) q;
  return jsonb_build_object('imported', supplied_count);
end;
$$;

grant execute on function public.replace_subject_mcq_questions(text, jsonb) to authenticated;
