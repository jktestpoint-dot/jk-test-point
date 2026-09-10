-- Updates existing records only; never inserts, deletes, or changes questions.
update public."MOCK_TESTS"
set question_count = 80, duration_minutes = 80, total_marks = 80, negative_marking = '0.25 per wrong answer'
where title = 'Junior Assistant Mock 01';

update public."MOCK_TESTS"
set question_count = 120, duration_minutes = 120, total_marks = 120
where title = 'UT Mock 01';
