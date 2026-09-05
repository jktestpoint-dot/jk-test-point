-- Dedicated, non-destructive subject MCQ bank. Official answers remain private
-- and are evaluated only inside the submission RPC.
create table if not exists public."SUBJECT_MCQ_QUESTIONS" (
  id uuid primary key default gen_random_uuid(),
  subject text not null check (subject in ('accountancy', 'mathematics', 'statistics', 'economics')),
  question_number integer not null check (question_number > 0),
  question_text text not null check (char_length(trim(question_text)) > 0),
  option_a text not null check (char_length(trim(option_a)) > 0),
  option_b text not null check (char_length(trim(option_b)) > 0),
  option_c text not null check (char_length(trim(option_c)) > 0),
  option_d text not null check (char_length(trim(option_d)) > 0),
  correct_option char(1) not null check (correct_option in ('A', 'B', 'C', 'D')),
  explanation text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (subject, question_number)
);
create index if not exists subject_mcq_questions_subject_number_idx on public."SUBJECT_MCQ_QUESTIONS" (subject, question_number);

alter table public."SUBJECT_MCQ_QUESTIONS" enable row level security;
revoke all on public."SUBJECT_MCQ_QUESTIONS" from anon, authenticated;
grant select (id, subject, question_number, question_text, option_a, option_b, option_c, option_d, explanation) on public."SUBJECT_MCQ_QUESTIONS" to anon, authenticated;
drop policy if exists "Subject MCQ questions are readable without answers" on public."SUBJECT_MCQ_QUESTIONS";
create policy "Subject MCQ questions are readable without answers" on public."SUBJECT_MCQ_QUESTIONS" for select to anon, authenticated using (true);

create table if not exists public."SUBJECT_MCQ_ATTEMPTS" (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null check (subject in ('accountancy', 'mathematics', 'statistics', 'economics')),
  score integer not null,
  percentage numeric not null,
  total_questions integer not null check (total_questions > 0),
  correct integer not null check (correct >= 0),
  incorrect integer not null check (incorrect >= 0),
  unattempted integer not null check (unattempted >= 0),
  answers jsonb not null default '[]'::jsonb,
  review jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists subject_mcq_attempts_user_subject_created_idx on public."SUBJECT_MCQ_ATTEMPTS" (user_id, subject, created_at desc);
alter table public."SUBJECT_MCQ_ATTEMPTS" enable row level security;
revoke all on public."SUBJECT_MCQ_ATTEMPTS" from anon, authenticated;
grant select on public."SUBJECT_MCQ_ATTEMPTS" to authenticated;
drop policy if exists "Students can read their own subject MCQ attempts" on public."SUBJECT_MCQ_ATTEMPTS";
create policy "Students can read their own subject MCQ attempts" on public."SUBJECT_MCQ_ATTEMPTS" for select to authenticated using (user_id = auth.uid());

create or replace function public.replace_subject_mcq_questions(p_subject text, p_questions jsonb)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare supplied_count integer;
begin
  if not public.is_jk_test_admin() then raise exception 'Administrator access is required'; end if;
  if p_subject not in ('accountancy', 'mathematics', 'statistics', 'economics') then raise exception 'Invalid subject'; end if;
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

create or replace function public.submit_subject_mcq_attempt(p_subject text, p_answers jsonb)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare actual_count integer; correct_count integer; incorrect_count integer; attempt_id uuid; submitted_answers jsonb; question_review jsonb;
begin
  if auth.uid() is null then raise exception 'Please log in before submitting practice'; end if;
  if p_subject not in ('accountancy', 'mathematics', 'statistics', 'economics') then raise exception 'Invalid subject'; end if;
  if jsonb_typeof(p_answers) <> 'array' then raise exception 'Answers must be an array'; end if;
  select count(*) into actual_count from public."SUBJECT_MCQ_QUESTIONS" where subject = p_subject;
  if actual_count = 0 then raise exception 'This subject is not ready yet. Questions are still being added.'; end if;
  select count(*) into correct_count from public."SUBJECT_MCQ_QUESTIONS" q where q.subject = p_subject and exists (select 1 from jsonb_array_elements(p_answers) a where a->>'question_id' = q.id::text and a->>'selected_option' = q.correct_option);
  select count(*) into incorrect_count from public."SUBJECT_MCQ_QUESTIONS" q where q.subject = p_subject and exists (select 1 from jsonb_array_elements(p_answers) a where a->>'question_id' = q.id::text and coalesce(a->>'selected_option', '') <> '' and a->>'selected_option' <> q.correct_option);
  select coalesce(jsonb_agg(jsonb_build_object('question_id', q.id, 'selected_option', answer.selected_option) order by q.question_number), '[]'::jsonb) into submitted_answers from public."SUBJECT_MCQ_QUESTIONS" q left join lateral (select nullif(a->>'selected_option', '') as selected_option from jsonb_array_elements(p_answers) a where a->>'question_id' = q.id::text limit 1) answer on true where q.subject = p_subject;
  select coalesce(jsonb_agg(jsonb_build_object('question_id', q.id, 'question_number', q.question_number, 'question_text', q.question_text, 'selected_option', answer.selected_option, 'selected_answer', case answer.selected_option when 'A' then q.option_a when 'B' then q.option_b when 'C' then q.option_c when 'D' then q.option_d else null end, 'correct_option', q.correct_option, 'correct_answer', case q.correct_option when 'A' then q.option_a when 'B' then q.option_b when 'C' then q.option_c when 'D' then q.option_d end, 'status', case when answer.selected_option is null then 'unattempted' when answer.selected_option = q.correct_option then 'correct' else 'incorrect' end, 'explanation', q.explanation) order by q.question_number), '[]'::jsonb) into question_review from public."SUBJECT_MCQ_QUESTIONS" q left join lateral (select nullif(a->>'selected_option', '') as selected_option from jsonb_array_elements(p_answers) a where a->>'question_id' = q.id::text limit 1) answer on true where q.subject = p_subject;
  insert into public."SUBJECT_MCQ_ATTEMPTS" (user_id, subject, score, percentage, total_questions, correct, incorrect, unattempted, answers, review) values (auth.uid(), p_subject, correct_count, round((correct_count::numeric / actual_count) * 100, 2), actual_count, correct_count, incorrect_count, actual_count - correct_count - incorrect_count, submitted_answers, question_review) returning id into attempt_id;
  return jsonb_build_object('attempt_id', attempt_id, 'score', correct_count, 'percentage', round((correct_count::numeric / actual_count) * 100, 2), 'question_count', actual_count, 'correct', correct_count, 'incorrect', incorrect_count, 'unattempted', actual_count - correct_count - incorrect_count, 'review', question_review);
end;
$$;
grant execute on function public.submit_subject_mcq_attempt(text, jsonb) to authenticated;
