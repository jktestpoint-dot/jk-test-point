-- Reclassify the existing twelve catalogue records for the UT Mock library
-- section. This is an in-place update and does not create duplicate tests.
alter table public."MOCK_TESTS"
  add column if not exists library_section text;

update public."MOCK_TESTS"
set
  library_section = 'UT Mock',
  question_count = 100,
  duration_minutes = 100,
  price = 49,
  questions = '[]'::jsonb,
  published = true,
  title = case id
    when 'jkssb-junior-assistant-paid-01' then 'Junior Assistant Mock 01'
    when 'jkssb-accounts-assistant-paid-01' then 'Accounts Assistant Mock 01'
    when 'jkssb-ahto-paid-01' then 'AHTO Mock 01'
    when 'jkssb-supervisor-paid-01' then 'Supervisor Mock 01'
    when 'jkp-constable-paid-01' then 'JKP Constable Mock 01'
    when 'jkpsi-paid-01' then 'JKPSI Mock 01'
    when 'sbi-paid-01' then 'SBI Mock 01'
    when 'jk-bank-paid-01' then 'J&K Bank Mock 01'
    when 'ku-junior-assistant-paid-01' then 'Kashmir University Junior Assistant Mock 01'
    when 'ku-jr-accounts-assistant-paid-01' then 'Jr. Accounts Assistant Mock 01'
    when 'ku-store-keeper-paid-01' then 'Store Keeper Mock 01'
    when 'high-court-junior-assistant-paid-01' then 'High Court Junior Assistant Mock 01'
  end
where id in (
  'jkssb-junior-assistant-paid-01',
  'jkssb-accounts-assistant-paid-01',
  'jkssb-ahto-paid-01',
  'jkssb-supervisor-paid-01',
  'jkp-constable-paid-01',
  'jkpsi-paid-01',
  'sbi-paid-01',
  'jk-bank-paid-01',
  'ku-junior-assistant-paid-01',
  'ku-jr-accounts-assistant-paid-01',
  'ku-store-keeper-paid-01',
  'high-court-junior-assistant-paid-01'
);
