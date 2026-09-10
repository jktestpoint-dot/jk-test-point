-- Persistent Contact Us submissions. Existing data and application tables are unchanged.
create table if not exists public."CONTACT_MESSAGES" (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 120),
  email text not null check (char_length(trim(email)) between 3 and 254),
  message text not null check (char_length(trim(message)) between 1 and 5000),
  created_at timestamptz not null default now()
);

create index if not exists contact_messages_created_at_idx
  on public."CONTACT_MESSAGES" (created_at desc);

alter table public."CONTACT_MESSAGES" enable row level security;
revoke all on public."CONTACT_MESSAGES" from anon, authenticated;
grant select on public."CONTACT_MESSAGES" to authenticated;

drop policy if exists "Administrators can read contact messages" on public."CONTACT_MESSAGES";
create policy "Administrators can read contact messages"
  on public."CONTACT_MESSAGES" for select to authenticated
  using (public.is_jk_test_admin());

create or replace function public.submit_contact_message(p_name text, p_email text, p_message text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  message_id uuid;
  submitted_at timestamptz;
begin
  if p_name is null or char_length(trim(p_name)) not between 1 and 120 then
    raise exception 'Enter a valid name';
  end if;
  if p_email is null or char_length(trim(p_email)) not between 3 and 254
    or trim(p_email) !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Enter a valid email address';
  end if;
  if p_message is null or char_length(trim(p_message)) not between 1 and 5000 then
    raise exception 'Enter a valid message';
  end if;

  insert into public."CONTACT_MESSAGES" (name, email, message)
  values (trim(p_name), lower(trim(p_email)), trim(p_message))
  returning id, created_at into message_id, submitted_at;

  return jsonb_build_object('id', message_id, 'created_at', submitted_at);
end;
$$;

revoke all on function public.submit_contact_message(text, text, text) from public;
grant execute on function public.submit_contact_message(text, text, text) to anon, authenticated;
