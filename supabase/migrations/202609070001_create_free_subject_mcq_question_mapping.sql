-- Additive foundation for explicitly selected free-practice questions.
-- This migration does not copy question content or change the paid subject-MCQ
-- bank, its RLS policy, entitlements, attempts, or payment logic.

create table if not exists public."FREE_SUBJECT_MCQ_QUESTIONS" (
  id uuid primary key default gen_random_uuid(),
  subject text not null check (char_length(trim(subject)) > 0),
  question_id uuid not null references public."SUBJECT_MCQ_QUESTIONS"(id) on delete cascade,
  display_order integer check (display_order is null or display_order > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint free_subject_mcq_questions_subject_question_unique unique (subject, question_id)
);

create index if not exists free_subject_mcq_questions_active_order_idx
  on public."FREE_SUBJECT_MCQ_QUESTIONS" (subject, display_order, question_id)
  where is_active;

create index if not exists free_subject_mcq_questions_question_id_idx
  on public."FREE_SUBJECT_MCQ_QUESTIONS" (question_id);

-- Prevent a mapping from labelling a question as a different subject than the
-- subject stored by the canonical question bank.
create or replace function public.validate_free_subject_mcq_question_mapping()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_question_subject text;
begin
  select subject
  into v_question_subject
  from public."SUBJECT_MCQ_QUESTIONS"
  where id = new.question_id;

  if v_question_subject is null then
    raise exception 'Free-practice question does not exist';
  end if;

  if new.subject <> v_question_subject then
    raise exception 'Free-practice mapping subject must match the source question subject';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_free_subject_mcq_question_mapping() from public, anon, authenticated;

drop trigger if exists validate_free_subject_mcq_question_mapping on public."FREE_SUBJECT_MCQ_QUESTIONS";
create trigger validate_free_subject_mcq_question_mapping
before insert or update of subject, question_id
on public."FREE_SUBJECT_MCQ_QUESTIONS"
for each row execute function public.validate_free_subject_mcq_question_mapping();

alter table public."FREE_SUBJECT_MCQ_QUESTIONS" enable row level security;
revoke all on table public."FREE_SUBJECT_MCQ_QUESTIONS" from public, anon, authenticated;
grant select on table public."FREE_SUBJECT_MCQ_QUESTIONS" to authenticated;

drop policy if exists "Authenticated students can read active free subject question mappings"
  on public."FREE_SUBJECT_MCQ_QUESTIONS";
create policy "Authenticated students can read active free subject question mappings"
on public."FREE_SUBJECT_MCQ_QUESTIONS"
for select
to authenticated
using (is_active = true);

