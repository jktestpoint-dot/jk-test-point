-- Database-backed mock-test catalogue.  This migration is additive: it never
-- changes or deletes STUDENTS, TEST_ATTEMPTS, Auth users, payments, or data.
create table if not exists public."MOCK_TESTS" (
  id text primary key,
  title text not null check (char_length(trim(title)) > 0),
  main_category text not null check (main_category in ('JKSSB', 'Banking', 'Kashmir University', 'High Court')),
  subcategory text not null check (char_length(trim(subcategory)) > 0),
  description text not null default '',
  question_count integer not null check (question_count > 0),
  duration_minutes integer not null check (duration_minutes > 0),
  price integer not null default 0 check (price >= 0),
  difficulty text not null default 'Medium' check (difficulty in ('Easy', 'Medium', 'Hard')),
  total_marks integer not null check (total_marks > 0),
  negative_marking text not null default 'None',
  questions jsonb not null default '[]'::jsonb check (jsonb_typeof(questions) = 'array'),
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mock_tests_public_category_idx
  on public."MOCK_TESTS" (main_category, subcategory)
  where published = true;

alter table public."MOCK_TESTS" enable row level security;

-- The website can read only published tests. Client-side writes remain denied;
-- test uploads must use a trusted administrator/server process.
drop policy if exists "Published mock tests are readable" on public."MOCK_TESTS";
create policy "Published mock tests are readable"
  on public."MOCK_TESTS" for select
  to anon, authenticated
  using (published = true);

-- Initial paid catalogue: exactly one test for each supported subcategory.
-- `questions` stays as an empty JSON array until its 100 questions are bulk
-- imported through trusted administration tooling.
insert into public."MOCK_TESTS" (id, title, main_category, subcategory, description, question_count, duration_minutes, price, difficulty, total_marks, negative_marking, questions, published)
values
  ('jkssb-junior-assistant-paid-01', 'JKSSB Junior Assistant Paid Mock 01', 'JKSSB', 'Junior Assistant', 'Full-length paid mock test for JKSSB Junior Assistant preparation.', 100, 120, 99, 'Medium', 100, '0.25 mark', '[]'::jsonb, true),
  ('jkssb-accounts-assistant-paid-01', 'JKSSB Accounts Assistant Paid Mock 01', 'JKSSB', 'Accounts Assistant', 'Full-length paid mock test for JKSSB Accounts Assistant preparation.', 100, 120, 99, 'Medium', 100, '0.25 mark', '[]'::jsonb, true),
  ('jkssb-ahto-paid-01', 'JKSSB AHTO Paid Mock 01', 'JKSSB', 'AHTO', 'Full-length paid mock test for JKSSB AHTO preparation.', 100, 120, 99, 'Medium', 100, '0.25 mark', '[]'::jsonb, true),
  ('jkssb-supervisor-paid-01', 'JKSSB Supervisor Paid Mock 01', 'JKSSB', 'Supervisor', 'Full-length paid mock test for JKSSB Supervisor preparation.', 100, 120, 99, 'Medium', 100, '0.25 mark', '[]'::jsonb, true),
  ('jkp-constable-paid-01', 'JKP Constable Paid Mock 01', 'JKSSB', 'JKP Constable', 'Full-length paid mock test for JKP Constable preparation.', 100, 120, 99, 'Medium', 100, '0.25 mark', '[]'::jsonb, true),
  ('jkpsi-paid-01', 'JKPSI Paid Mock 01', 'JKSSB', 'JKPSI', 'Full-length paid mock test for JKPSI preparation.', 100, 120, 99, 'Medium', 100, '0.25 mark', '[]'::jsonb, true),
  ('sbi-paid-01', 'SBI Paid Mock 01', 'Banking', 'SBI', 'Full-length paid mock test for SBI banking preparation.', 100, 120, 99, 'Medium', 100, '0.25 mark', '[]'::jsonb, true),
  ('jk-bank-paid-01', 'J&K Bank Paid Mock 01', 'Banking', 'J&K Bank', 'Full-length paid mock test for J&K Bank preparation.', 100, 120, 99, 'Medium', 100, '0.25 mark', '[]'::jsonb, true),
  ('ku-junior-assistant-paid-01', 'Kashmir University Junior Assistant Paid Mock 01', 'Kashmir University', 'Junior Assistant', 'Full-length paid mock test for Kashmir University Junior Assistant preparation.', 100, 120, 99, 'Medium', 100, '0.25 mark', '[]'::jsonb, true),
  ('ku-jr-accounts-assistant-paid-01', 'Kashmir University Jr. Accounts Assistant Paid Mock 01', 'Kashmir University', 'Jr. Accounts Assistant', 'Full-length paid mock test for Kashmir University Jr. Accounts Assistant preparation.', 100, 120, 99, 'Medium', 100, '0.25 mark', '[]'::jsonb, true),
  ('ku-store-keeper-paid-01', 'Kashmir University Store Keeper Paid Mock 01', 'Kashmir University', 'Store Keeper', 'Full-length paid mock test for Kashmir University Store Keeper preparation.', 100, 120, 99, 'Medium', 100, '0.25 mark', '[]'::jsonb, true),
  ('high-court-junior-assistant-paid-01', 'High Court Junior Assistant Paid Mock 01', 'High Court', 'Junior Assistant', 'Full-length paid mock test for High Court Junior Assistant preparation.', 100, 120, 99, 'Medium', 100, '0.25 mark', '[]'::jsonb, true)
on conflict (id) do nothing;

-- Keep updated_at accurate for future trusted upload tooling.
create or replace function public.set_mock_test_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_mock_test_updated_at on public."MOCK_TESTS";
create trigger set_mock_test_updated_at
before update on public."MOCK_TESTS"
for each row execute function public.set_mock_test_updated_at();
