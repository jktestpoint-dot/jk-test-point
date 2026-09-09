-- Secure, test-wise leaderboard foundation.
-- Rankings are derived server-side from completed mock test attempts only.

-- Mock attempts are submitted by public.submit_mock_test_attempt(), which
-- calculates score and review server-side. Direct client inserts would allow a
-- student to fabricate a rankable score, so keep direct reads but remove the
-- legacy direct insert path.
drop policy if exists "Students can create their own test attempts"
  on public."TEST_ATTEMPTS";

revoke all on table public."TEST_ATTEMPTS" from public, anon;
revoke insert, update, delete on table public."TEST_ATTEMPTS" from authenticated;
grant select on table public."TEST_ATTEMPTS" to authenticated;

-- This supports selecting a user's best valid attempt for one test without
-- adding a broad index to unrelated attempt queries.
create index if not exists test_attempts_test_user_best_rank_idx
  on public."TEST_ATTEMPTS" (
    test_id,
    user_id,
    percentage desc,
    created_at asc,
    id asc
  )
  where total_marks is not null
    and total_marks > 0
    and score >= 0
    and percentage >= 0
    and percentage <= 100;

-- Keep the ranking implementation outside the exposed REST schema. The public
-- wrapper below returns a deliberately narrow, public-safe projection only.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.get_test_leaderboard(p_test_id text)
returns table (
  rank integer,
  display_name text,
  percentage numeric,
  score integer,
  test_title text
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null then
    raise exception 'Please log in to view the leaderboard';
  end if;

  if p_test_id is null or btrim(p_test_id) = '' then
    raise exception 'A valid mock test is required';
  end if;

  return query
  with published_test as (
    select t.id, t.title, t.total_marks, count(q.id)::integer as question_count
    from public."MOCK_TESTS" t
    join public."TEST_QUESTIONS" q on q.test_id = t.id
    where t.id = p_test_id
      and t.published is true
      and coalesce(t.total_marks, 0) > 0
    group by t.id, t.title, t.total_marks
  ),
  qualifying_attempts as (
    select
      a.id,
      a.user_id,
      a.score,
      a.percentage,
      a.created_at,
      t.title,
      t.total_marks,
      t.question_count
    from public."TEST_ATTEMPTS" a
    join published_test t on t.id = a.test_id
    where a.total_marks is not null
      and a.total_marks > 0
      and a.total_marks = t.total_marks
      and a.score >= 0
      and a.score <= a.total_marks
      and a.percentage >= 0
      and a.percentage <= 100
      and a.percentage = round((a.score::numeric / a.total_marks) * 100, 2)
      -- A completed server-side submission persists one review item per
      -- question. Empty, partial, or malformed review payloads are not
      -- rankable.
      and jsonb_typeof(a.review) = 'array'
      and jsonb_array_length(a.review) = t.question_count
  ),
  best_attempt_per_student as (
    select distinct on (a.user_id)
      a.id,
      a.score,
      a.percentage,
      a.created_at,
      a.title
    from qualifying_attempts a
    order by a.user_id, a.percentage desc, a.created_at asc, a.id asc
  ),
  ranked_attempts as (
    select
      row_number() over (
        order by a.percentage desc, a.created_at asc, a.id asc
      )::integer as rank,
      a.score,
      a.percentage,
      a.title,
      a.created_at
    from best_attempt_per_student a
  )
  select
    a.rank,
    format('Student #%s', a.rank),
    a.percentage,
    a.score,
    a.title
  from ranked_attempts a
  order by a.rank;
end;
$$;

revoke all on function private.get_test_leaderboard(text)
  from public, anon, authenticated;

create or replace function public.get_test_leaderboard(p_test_id text)
returns table (
  rank integer,
  display_name text,
  percentage numeric,
  score integer,
  test_title text
)
language sql
security definer
set search_path = pg_catalog, public, private
as $$
  select rank, display_name, percentage, score, test_title
  from private.get_test_leaderboard(p_test_id);
$$;

revoke all on function public.get_test_leaderboard(text)
  from public, anon;
grant execute on function public.get_test_leaderboard(text)
  to authenticated;
