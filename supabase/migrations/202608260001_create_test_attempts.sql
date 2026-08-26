create table if not exists public."TEST_ATTEMPTS" (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  test_id text,
  test_title text,
  score integer not null,
  percentage numeric not null,
  created_at timestamptz not null default now()
);

alter table public."TEST_ATTEMPTS" enable row level security;

drop policy if exists "Students can read their own test attempts" on public."TEST_ATTEMPTS";
create policy "Students can read their own test attempts"
on public."TEST_ATTEMPTS" for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Students can create their own test attempts" on public."TEST_ATTEMPTS";
create policy "Students can create their own test attempts"
on public."TEST_ATTEMPTS" for insert
to authenticated
with check (user_id = auth.uid());
