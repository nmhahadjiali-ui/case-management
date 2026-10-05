-- =============================================================================
-- Email change requests
-- Non-administrators cannot change their sign-in email directly. They file a
-- request; an administrator approves (the app then updates auth.users, and the
-- on_auth_user_email_changed trigger syncs profiles.email) or rejects it.
-- =============================================================================

create table public.email_change_requests (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  current_email text not null,
  new_email     text not null check (char_length(new_email) between 3 and 254),
  reason        text check (char_length(reason) <= 500),
  status        text not null default 'pending'
                check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  review_note   text check (char_length(review_note) <= 500),
  reviewed_by   uuid references public.profiles (id) on delete set null,
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now()
);
create index email_change_requests_status_idx on public.email_change_requests (status, created_at desc);
-- At most one open request per user.
create unique index email_change_requests_one_pending
  on public.email_change_requests (user_id) where status = 'pending';

alter table public.email_change_requests enable row level security;

create policy "email requests read" on public.email_change_requests for select to authenticated
  using ((user_id = auth.uid() and public.is_active_user()) or public.has_role('administrator'));

create policy "email requests insert own" on public.email_change_requests for insert to authenticated
  with check (user_id = auth.uid() and public.is_active_user() and status = 'pending'
              and reviewed_by is null and reviewed_at is null);

-- Requesters may only withdraw their own pending request.
create policy "email requests cancel own" on public.email_change_requests for update to authenticated
  using (user_id = auth.uid() and status = 'pending')
  with check (user_id = auth.uid() and status = 'cancelled');

create policy "email requests admin update" on public.email_change_requests for update to authenticated
  using (public.has_role('administrator')) with check (public.has_role('administrator'));

grant select, insert, update on public.email_change_requests to authenticated;
grant all on public.email_change_requests to service_role;

-- Notifications + audit trail
create or replace function public.notify_email_change_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  r record;
begin
  select full_name into v_name from public.profiles where id = new.user_id;

  if tg_op = 'INSERT' then
    for r in select id from public.profiles where is_active and role = 'administrator' and id <> new.user_id
    loop
      perform public.notify(r.id, 'Email change requested',
        format('%s wants to change their email to %s', v_name, new.new_email), 'system', null, '/settings/users');
    end loop;
    perform public.log_activity('email_change.requested', 'email_change', new.id, null,
      format('%s requested an email change to %s', v_name, new.new_email),
      jsonb_build_object('from', new.current_email, 'to', new.new_email), new.user_id);

  elsif new.status is distinct from old.status and new.status in ('approved', 'rejected') then
    perform public.notify(new.user_id,
      case when new.status = 'approved' then 'Email change approved' else 'Email change rejected' end,
      case when new.status = 'approved'
        then format('Your sign-in email is now %s.', new.new_email)
        else format('Your request to use %s was not approved.%s', new.new_email,
                    coalesce(' Note: ' || nullif(new.review_note, ''), ''))
      end,
      'system', null, '/settings/profile');
    perform public.log_activity('email_change.' || new.status, 'email_change', new.id, null,
      format('Email change for %s (%s → %s) %s', v_name, new.current_email, new.new_email, new.status),
      jsonb_build_object('from', new.current_email, 'to', new.new_email, 'note', new.review_note), new.reviewed_by);
  end if;
  return null;
end;
$$;

create trigger email_change_requests_notify
  after insert or update of status on public.email_change_requests
  for each row execute function public.notify_email_change_request();
