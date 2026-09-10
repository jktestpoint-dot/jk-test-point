-- Returns only the caller's aggregate progress. Ranking stays in PostgreSQL so
-- clients never receive or control other students' private attempt data.
create or replace function public.get_my_dashboard_progress()
returns table (tests_done integer, accuracy integer, best_score integer, student_rank integer)
language sql
security definer
set search_path = public
as $$
  with student_scores as (
    select user_id,
      count(*)::integer as tests_done,
      round(avg(percentage))::integer as accuracy,
      max(percentage)::integer as best_score
    from public."TEST_ATTEMPTS"
    group by user_id
  ), ranked as (
    select *, dense_rank() over (order by best_score desc, accuracy desc, tests_done desc)::integer as student_rank
    from student_scores
  )
  select coalesce(r.tests_done, 0), coalesce(r.accuracy, 0), coalesce(r.best_score, 0), coalesce(r.student_rank, 0)
  from (select auth.uid() as user_id) caller
  left join ranked r on r.user_id = caller.user_id;
$$;

revoke all on function public.get_my_dashboard_progress() from public;
grant execute on function public.get_my_dashboard_progress() to authenticated;
