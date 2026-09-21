-- Add empty JKSSB Mock 02/03 catalogue records only.
-- Questions are intentionally imported later through the existing admin workflow.
-- Existing Mock 01 records, questions, payments, and entitlements are untouched.
insert into public."MOCK_TESTS" (
  id,
  title,
  main_category,
  subcategory,
  description,
  question_count,
  duration_minutes,
  price,
  difficulty,
  total_marks,
  negative_marking,
  questions,
  published
)
values
  ('jkssb-accounts-assistant-paid-02', 'Accounts Assistant Mock 02', 'JKSSB', 'Accounts Assistant', 'Full-length paid mock test for JKSSB Accounts Assistant preparation.', 0, 0, 49, 'Medium', 120, '0.25 mark', '[]'::jsonb, true),
  ('jkssb-accounts-assistant-paid-03', 'Accounts Assistant Mock 03', 'JKSSB', 'Accounts Assistant', 'Full-length paid mock test for JKSSB Accounts Assistant preparation.', 0, 0, 49, 'Medium', 120, '0.25 mark', '[]'::jsonb, true),
  ('jkpsi-paid-02', 'JKPSI Mock 02', 'JKSSB', 'JKPSI', 'Full-length paid mock test for JKPSI preparation.', 0, 0, 49, 'Medium', 200, '0.25 mark', '[]'::jsonb, true),
  ('jkpsi-paid-03', 'JKPSI Mock 03', 'JKSSB', 'JKPSI', 'Full-length paid mock test for JKPSI preparation.', 0, 0, 49, 'Medium', 200, '0.25 mark', '[]'::jsonb, true),
  ('jkp-constable-paid-02', 'JKP Constable Mock 02', 'JKSSB', 'JKP Constable', 'Full-length paid mock test for JKP Constable preparation.', 0, 0, 49, 'Medium', 100, '0.25 mark', '[]'::jsonb, true),
  ('jkp-constable-paid-03', 'JKP Constable Mock 03', 'JKSSB', 'JKP Constable', 'Full-length paid mock test for JKP Constable preparation.', 0, 0, 49, 'Medium', 100, '0.25 mark', '[]'::jsonb, true)
on conflict (id) do nothing;
