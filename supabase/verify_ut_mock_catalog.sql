select
  id,
  title,
  library_section,
  main_category,
  subcategory,
  question_count,
  duration_minutes,
  price,
  published,
  jsonb_array_length(questions) as imported_questions
from public."MOCK_TESTS"
where library_section = 'UT Mock'
order by main_category, subcategory;
