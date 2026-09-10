select
  id,
  title,
  main_category,
  subcategory,
  question_count,
  duration_minutes,
  price,
  difficulty,
  published,
  jsonb_array_length(questions) as imported_questions
from public."MOCK_TESTS"
order by main_category, subcategory;
