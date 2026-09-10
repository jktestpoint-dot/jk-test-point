-- Persistent, user-owned bookmarks keyed by logical question identity.
-- Question UUIDs are intentionally not used as the unique identity because
-- CSV replacement imports recreate question rows.

create table if not exists public.user_question_bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null check (source_type in ('mock', 'subject')),
  source_key text not null check (char_length(trim(source_key)) > 0),
  question_number integer not null check (question_number > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_question_bookmarks_user_logical_question_unique
    unique (user_id, source_type, source_key, question_number)
);

create index if not exists user_question_bookmarks_user_created_idx
  on public.user_question_bookmarks (user_id, created_at desc);

create or replace function public.set_user_question_bookmark_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_user_question_bookmark_updated_at()
  from public, anon, authenticated;

drop trigger if exists set_user_question_bookmark_updated_at on public.user_question_bookmarks;
create trigger set_user_question_bookmark_updated_at
before update on public.user_question_bookmarks
for each row execute function public.set_user_question_bookmark_updated_at();

alter table public.user_question_bookmarks enable row level security;
revoke all on table public.user_question_bookmarks from public, anon, authenticated;
grant select, insert, delete on table public.user_question_bookmarks to authenticated;

drop policy if exists "Students can read their own question bookmarks"
  on public.user_question_bookmarks;
create policy "Students can read their own question bookmarks"
on public.user_question_bookmarks
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Students can create their own question bookmarks"
  on public.user_question_bookmarks;
create policy "Students can create their own question bookmarks"
on public.user_question_bookmarks
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Students can delete their own question bookmarks"
  on public.user_question_bookmarks;
create policy "Students can delete their own question bookmarks"
on public.user_question_bookmarks
for delete
to authenticated
using (user_id = auth.uid());
