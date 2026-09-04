-- CSV/XLSX count is authoritative for import; MOCK_TESTS.question_count is not a cap.
create or replace function public.replace_test_questions(p_test_id text, p_questions jsonb)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare supplied_count integer;
begin
  if not public.is_jk_test_admin() then raise exception 'Administrator access is required'; end if;
  if not exists (select 1 from public."MOCK_TESTS" where id = p_test_id) then raise exception 'Selected test does not exist'; end if;
  if jsonb_typeof(p_questions) <> 'array' then raise exception 'Questions must be an array'; end if;
  supplied_count := jsonb_array_length(p_questions);
  if supplied_count = 0 then raise exception 'Import contains no questions'; end if;
  if exists (select 1 from jsonb_array_elements(p_questions) q where jsonb_typeof(q) <> 'object' or (q->>'question_number') !~ '^[1-9][0-9]*$' or coalesce(nullif(trim(q->>'question_text'), ''), '') = '' or coalesce(nullif(trim(q->>'option_a'), ''), '') = '' or coalesce(nullif(trim(q->>'option_b'), ''), '') = '' or coalesce(nullif(trim(q->>'option_c'), ''), '') = '' or coalesce(nullif(trim(q->>'option_d'), ''), '') = '' or q->>'correct_option' not in ('A','B','C','D')) then raise exception 'One or more question rows are malformed'; end if;
  if exists (select 1 from (select q->>'question_number' n from jsonb_array_elements(p_questions) q group by q->>'question_number' having count(*) > 1) d) then raise exception 'Duplicate question numbers found'; end if;
  delete from public."TEST_QUESTIONS" where test_id = p_test_id;
  insert into public."TEST_QUESTIONS" (test_id, question_number, question_text, option_a, option_b, option_c, option_d, correct_option, explanation)
  select p_test_id, (q->>'question_number')::integer, q->>'question_text', q->>'option_a', q->>'option_b', q->>'option_c', q->>'option_d', q->>'correct_option', nullif(q->>'explanation','') from jsonb_array_elements(p_questions) q;
  return jsonb_build_object('imported', supplied_count, 'question_count', supplied_count);
end;
$$;
grant execute on function public.replace_test_questions(text, jsonb) to authenticated;
