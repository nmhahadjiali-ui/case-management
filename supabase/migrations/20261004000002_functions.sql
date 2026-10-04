-- =============================================================================
-- Views, audit logging, notifications and RPC functions
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Read views (security_invoker = RLS of the querying user applies)
-- ---------------------------------------------------------------------------
create or replace view public.case_list
with (security_invoker = true) as
select
  c.*,
  ct.name  as case_type_name,
  ct.slug  as case_type_slug,
  ap.full_name as assigned_to_name,
  d.name   as department_name,
  l.name   as location_name,
  (select string_agg(pe.full_name, ', ' order by pe.full_name)
     from public.case_parties cp join public.people pe on pe.id = cp.person_id
    where cp.case_id = c.id and cp.role = 'complainant') as complainants,
  (select string_agg(pe.full_name, ', ' order by pe.full_name)
     from public.case_parties cp join public.people pe on pe.id = cp.person_id
    where cp.case_id = c.id and cp.role = 'defendant') as defendants,
  (select min(e.starts_at) from public.events e
    where e.case_id = c.id and e.event_type = 'hearing'
      and e.status = 'scheduled' and e.starts_at >= now()) as next_hearing
from public.cases c
join public.case_types ct on ct.id = c.case_type_id
left join public.profiles ap on ap.id = c.assigned_to
left join public.departments d on d.id = c.department_id
left join public.locations l on l.id = c.location_id;

create or replace view public.people_list
with (security_invoker = true) as
select
  pe.*,
  count(distinct cp.case_id)::int as case_count,
  coalesce(array_agg(distinct ct.name) filter (where ct.name is not null), '{}') as case_types,
  coalesce(array_agg(distinct cp.role::text) filter (where cp.role is not null), '{}') as case_roles
from public.people pe
left join public.case_parties cp on cp.person_id = pe.id
left join public.cases c on c.id = cp.case_id
left join public.case_types ct on ct.id = c.case_type_id
group by pe.id;

-- ---------------------------------------------------------------------------
-- Activity logging
-- ---------------------------------------------------------------------------
create or replace function public.log_activity(
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_case_id uuid,
  p_description text,
  p_metadata jsonb default '{}'::jsonb,
  p_user_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := coalesce(auth.uid(), p_user_id);
begin
  -- During cascaded deletes the parent case may already be gone.
  if p_case_id is not null and not exists (select 1 from public.cases where id = p_case_id) then
    p_case_id := null;
  end if;
  if v_user is not null and not exists (select 1 from public.profiles where id = v_user) then
    v_user := null;
  end if;

  insert into public.activity_logs (user_id, action, entity_type, entity_id, case_id, description, metadata)
  values (v_user, p_action, p_entity_type, p_entity_id, p_case_id, p_description, coalesce(p_metadata, '{}'::jsonb));
end;
$$;

-- Only triggers / other definer functions may write the audit log directly.
revoke execute on function public.log_activity(text, text, uuid, uuid, text, jsonb, uuid) from public, anon, authenticated;

create or replace function public.audit_cases()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_activity('case.created', 'case', new.id, new.id,
      format('Case %s "%s" created', new.case_number, new.title), '{}'::jsonb, new.created_by);
  elsif tg_op = 'UPDATE' then
    if new.status is distinct from old.status then
      perform public.log_activity('case.status_changed', 'case', new.id, new.id,
        format('Case %s status changed from %s to %s', new.case_number,
               replace(old.status::text, '_', ' '), replace(new.status::text, '_', ' ')),
        jsonb_build_object('from', old.status, 'to', new.status));
    end if;
    if new.assigned_to is distinct from old.assigned_to then
      perform public.log_activity('case.assigned', 'case', new.id, new.id,
        format('Case %s assigned to %s', new.case_number,
               coalesce((select full_name from public.profiles where id = new.assigned_to), 'nobody')));
    end if;
    if (to_jsonb(new) - array['status', 'assigned_to', 'updated_at'])
       is distinct from (to_jsonb(old) - array['status', 'assigned_to', 'updated_at']) then
      perform public.log_activity('case.updated', 'case', new.id, new.id,
        format('Case %s updated', new.case_number));
    end if;
  elsif tg_op = 'DELETE' then
    perform public.log_activity('case.deleted', 'case', old.id, null,
      format('Case %s "%s" deleted', old.case_number, old.title));
  end if;
  return null;
end;
$$;

create trigger cases_audit after insert or update or delete on public.cases
  for each row execute function public.audit_cases();

create or replace function public.audit_people()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_activity('person.created', 'person', new.id, null,
      format('Person %s added', new.full_name), '{}'::jsonb, new.created_by);
  elsif tg_op = 'UPDATE' then
    perform public.log_activity('person.updated', 'person', new.id, null,
      format('Person %s updated', new.full_name));
  elsif tg_op = 'DELETE' then
    perform public.log_activity('person.deleted', 'person', old.id, null,
      format('Person %s deleted', old.full_name));
  end if;
  return null;
end;
$$;

create trigger people_audit after insert or update or delete on public.people
  for each row execute function public.audit_people();

create or replace function public.audit_case_parties()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_name text;
  v_case text;
begin
  r := case when tg_op = 'DELETE' then old else new end;
  select full_name into v_name from public.people where id = r.person_id;
  select case_number into v_case from public.cases where id = r.case_id;
  if v_case is null then
    return null; -- parent case is being deleted; the case deletion is already logged
  end if;
  if tg_op = 'INSERT' then
    perform public.log_activity('party.added', 'case', r.case_id, r.case_id,
      format('%s added as %s to case %s', coalesce(v_name, 'A person'), r.role, v_case));
  else
    perform public.log_activity('party.removed', 'case', r.case_id, r.case_id,
      format('%s removed (%s) from case %s', coalesce(v_name, 'A person'), r.role, v_case));
  end if;
  return null;
end;
$$;

create trigger case_parties_audit after insert or delete on public.case_parties
  for each row execute function public.audit_case_parties();

create or replace function public.audit_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case text;
begin
  if tg_op = 'DELETE' then
    select case_number into v_case from public.cases where id = old.case_id;
    if old.case_id is not null and v_case is null then
      return null;
    end if;
    perform public.log_activity('event.deleted', 'event', old.id, old.case_id,
      format('%s "%s" deleted', initcap(old.event_type::text), old.title));
    return null;
  end if;

  select case_number into v_case from public.cases where id = new.case_id;
  if tg_op = 'INSERT' then
    perform public.log_activity(
      case when new.event_type = 'hearing' then 'hearing.scheduled' else 'event.created' end,
      'event', new.id, new.case_id,
      format('%s "%s" scheduled%s',
             initcap(new.event_type::text), new.title,
             coalesce(' for case ' || v_case, '')),
      '{}'::jsonb, new.created_by);
  else
    perform public.log_activity('event.updated', 'event', new.id, new.case_id,
      format('%s "%s" updated', initcap(new.event_type::text), new.title));
  end if;
  return null;
end;
$$;

create trigger events_audit after insert or update or delete on public.events
  for each row execute function public.audit_events();

create or replace function public.audit_tasks()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_activity('task.created', 'task', new.id, new.case_id,
      format('Task "%s" created', new.title), '{}'::jsonb, new.created_by);
  elsif tg_op = 'UPDATE' then
    if new.status = 'completed' and old.status <> 'completed' then
      perform public.log_activity('task.completed', 'task', new.id, new.case_id,
        format('Task "%s" completed', new.title));
    elsif new.status <> 'completed' and old.status = 'completed' then
      perform public.log_activity('task.reopened', 'task', new.id, new.case_id,
        format('Task "%s" reopened', new.title));
    else
      perform public.log_activity('task.updated', 'task', new.id, new.case_id,
        format('Task "%s" updated', new.title));
    end if;
  elsif tg_op = 'DELETE' then
    if old.case_id is not null and not exists (select 1 from public.cases where id = old.case_id) then
      return null;
    end if;
    perform public.log_activity('task.deleted', 'task', old.id, old.case_id,
      format('Task "%s" deleted', old.title));
  end if;
  return null;
end;
$$;

create trigger tasks_audit after insert or update or delete on public.tasks
  for each row execute function public.audit_tasks();

create or replace function public.audit_case_documents()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_activity('document.uploaded', 'document', new.id, new.case_id,
      format('Document "%s" uploaded', new.document_name), '{}'::jsonb, new.uploaded_by);
  elsif tg_op = 'DELETE' then
    if not exists (select 1 from public.cases where id = old.case_id) then
      return null;
    end if;
    perform public.log_activity('document.deleted', 'document', old.id, old.case_id,
      format('Document "%s" deleted', old.document_name));
  end if;
  return null;
end;
$$;

create trigger case_documents_audit after insert or delete on public.case_documents
  for each row execute function public.audit_case_documents();

create or replace function public.audit_case_notes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.log_activity('note.added', 'case', new.case_id, new.case_id,
    'Note added: ' || left(new.body, 80) || case when char_length(new.body) > 80 then '…' else '' end,
    '{}'::jsonb, new.created_by);
  return null;
end;
$$;

create trigger case_notes_audit after insert on public.case_notes
  for each row execute function public.audit_case_notes();

-- Called by the app right after a successful sign-in.
create or replace function public.log_login()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;
  perform public.log_activity('user.login', 'user', auth.uid(), null,
    format('%s signed in', coalesce((select full_name from public.profiles where id = auth.uid()), 'User')));
end;
$$;

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------
-- Does the user want in-app notifications of this kind?
create or replace function public.wants_notification(p_user uuid, p_type public.notification_type)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select s.in_app_notifications and case p_type
      when 'hearing'  then s.hearing_reminders
      when 'deadline' then s.deadline_reminders
      when 'task'     then s.task_reminders
      when 'case'     then s.case_updates
      else true end
    from public.user_settings s where s.user_id = p_user
  ), true)
  and exists (select 1 from public.profiles where id = p_user and is_active)
$$;

create or replace function public.notify(
  p_user uuid,
  p_title text,
  p_message text,
  p_type public.notification_type,
  p_case_id uuid default null,
  p_link text default null,
  p_dedupe_key text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user is null or not public.wants_notification(p_user, p_type) then
    return;
  end if;
  insert into public.notifications (user_id, title, message, type, related_case_id, link, dedupe_key)
  values (p_user, p_title, p_message, p_type, p_case_id, p_link, p_dedupe_key)
  on conflict (user_id, dedupe_key) do nothing;
end;
$$;

revoke execute on function public.notify(uuid, text, text, public.notification_type, uuid, text, text) from public, anon, authenticated;

create or replace function public.notify_case_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := coalesce(auth.uid(), new.created_by);
  v_link text := '/cases/' || new.id;
  r record;
begin
  if tg_op = 'INSERT' then
    -- Let administrators and case managers know a new case was added
    for r in select id from public.profiles
              where is_active and role in ('administrator', 'case_manager')
                and id is distinct from v_actor
    loop
      perform public.notify(r.id, 'New case added',
        format('Case %s: %s', new.case_number, new.title), 'case', new.id, v_link);
    end loop;
  end if;

  if new.assigned_to is not null and new.assigned_to is distinct from v_actor
     and (tg_op = 'INSERT' or new.assigned_to is distinct from old.assigned_to) then
    perform public.notify(new.assigned_to, 'Case assigned to you',
      format('Case %s: %s', new.case_number, new.title), 'case', new.id, v_link);
  end if;

  if tg_op = 'UPDATE' and new.status is distinct from old.status
     and new.assigned_to is not null and new.assigned_to is distinct from v_actor then
    perform public.notify(new.assigned_to, 'Case status changed',
      format('Case %s is now %s', new.case_number, replace(new.status::text, '_', ' ')),
      'case', new.id, v_link);
  end if;
  return null;
end;
$$;

create trigger cases_notify after insert or update on public.cases
  for each row execute function public.notify_case_changes();

create or replace function public.notify_task_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := coalesce(auth.uid(), new.created_by);
begin
  if new.assigned_to is not null and new.assigned_to is distinct from v_actor
     and (tg_op = 'INSERT' or new.assigned_to is distinct from old.assigned_to) then
    perform public.notify(new.assigned_to, 'New task assigned', new.title
      || coalesce(' — due ' || to_char(new.due_date, 'Mon DD, YYYY'), ''),
      'task', new.case_id, '/tasks');
  end if;
  return null;
end;
$$;

create trigger tasks_notify after insert or update of assigned_to on public.tasks
  for each row execute function public.notify_task_assignment();

create or replace function public.notify_hearing_scheduled()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case record;
  v_actor uuid := coalesce(auth.uid(), new.created_by);
begin
  if new.event_type <> 'hearing' or new.case_id is null then
    return null;
  end if;
  select id, case_number, assigned_to into v_case from public.cases where id = new.case_id;
  if v_case.assigned_to is not null and v_case.assigned_to is distinct from v_actor then
    perform public.notify(v_case.assigned_to, 'Hearing scheduled',
      format('%s for case %s', new.title, v_case.case_number),
      'hearing', new.case_id, '/calendar?type=hearing');
  end if;
  return null;
end;
$$;

create trigger events_notify after insert on public.events
  for each row execute function public.notify_hearing_scheduled();

-- Time-based reminders for the signed-in user. Idempotent thanks to dedupe_key,
-- so it is safe to call on every page load (or from a cron job).
create or replace function public.generate_my_reminders(p_tz text default 'UTC')
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_today date;
  v_count int := 0;
  r record;
begin
  if v_user is null or not public.is_active_user() then
    return 0;
  end if;
  begin
    v_today := (now() at time zone p_tz)::date;
  exception when others then
    v_today := current_date;
  end;

  -- Hearings in the next 48 hours on my cases (or that I scheduled)
  for r in
    select e.id, e.title, e.starts_at, e.case_id, c.case_number
      from public.events e
      left join public.cases c on c.id = e.case_id
     where e.event_type = 'hearing' and e.status = 'scheduled'
       and e.starts_at between now() and now() + interval '48 hours'
       and (c.assigned_to = v_user or e.created_by = v_user)
  loop
    perform public.notify(v_user, 'Upcoming hearing',
      format('%s%s', r.title, coalesce(' — case ' || r.case_number, '')),
      'hearing', r.case_id, '/calendar?type=hearing', 'hearing:' || r.id);
    v_count := v_count + 1;
  end loop;

  -- Other events whose reminder window has opened
  for r in
    select e.id, e.title, e.event_type, e.case_id
      from public.events e
     where e.event_type <> 'hearing' and e.status = 'scheduled'
       and e.reminder_minutes is not null and e.created_by = v_user
       and now() between e.starts_at - make_interval(mins => e.reminder_minutes) and e.starts_at
  loop
    perform public.notify(v_user, 'Event reminder', format('%s starts soon', r.title),
      case when r.event_type = 'deadline' then 'deadline'::public.notification_type else 'system' end,
      r.case_id, '/calendar', 'event:' || r.id);
    v_count := v_count + 1;
  end loop;

  -- Tasks due today
  for r in
    select t.id, t.title, t.case_id from public.tasks t
     where t.assigned_to = v_user and t.status <> 'completed' and t.due_date = v_today
  loop
    perform public.notify(v_user, 'Task due today', r.title, 'task', r.case_id, '/tasks?filter=today',
      'task-due:' || r.id || ':' || v_today);
    v_count := v_count + 1;
  end loop;

  -- Overdue tasks (once per task)
  for r in
    select t.id, t.title, t.case_id, t.due_date from public.tasks t
     where t.assigned_to = v_user and t.status <> 'completed' and t.due_date < v_today
  loop
    perform public.notify(v_user, 'Task overdue',
      format('%s (was due %s)', r.title, to_char(r.due_date, 'Mon DD')),
      'task', r.case_id, '/tasks?filter=overdue', 'task-overdue:' || r.id);
    v_count := v_count + 1;
  end loop;

  -- Case deadlines within 3 days
  for r in
    select c.id, c.case_number, c.title, c.deadline from public.cases c
     where c.assigned_to = v_user and c.status not in ('closed', 'archived')
       and c.deadline between v_today and v_today + 3
  loop
    perform public.notify(v_user, 'Deadline approaching',
      format('Case %s is due %s', r.case_number, to_char(r.deadline, 'Mon DD')),
      'deadline', r.id, '/cases/' || r.id, 'deadline:' || r.id || ':' || r.deadline);
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- Dashboard RPCs (security invoker: RLS applies)
-- ---------------------------------------------------------------------------
create or replace function public.get_dashboard_stats(p_today date default current_date)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'total',      count(*) filter (where status <> 'archived'),
    'active',     count(*) filter (where status = 'active'),
    'pending',    count(*) filter (where status = 'pending'),
    'closed',     count(*) filter (where status = 'closed'),
    'new',        count(*) filter (where status = 'new'),
    'overdue',    count(*) filter (where deadline < p_today and status not in ('closed', 'archived')),
    'due_week',   count(*) filter (where deadline between p_today and p_today + 7 and status not in ('closed', 'archived')),
    'filed_this_month', count(*) filter (where date_filed >= date_trunc('month', p_today)::date),
    'filed_last_month', count(*) filter (where date_filed >= (date_trunc('month', p_today) - interval '1 month')::date
                                          and date_filed < date_trunc('month', p_today)::date),
    'upcoming_hearings', (select count(*) from public.events
                           where event_type = 'hearing' and status = 'scheduled'
                             and starts_at >= now() and starts_at < now() + interval '30 days'),
    'tasks_due_today', (select count(*) from public.tasks where status <> 'completed' and due_date = p_today),
    'tasks_overdue',   (select count(*) from public.tasks where status <> 'completed' and due_date < p_today),
    'tasks_completed', (select count(*) from public.tasks where status = 'completed'),
    'tasks_upcoming',  (select count(*) from public.tasks where status <> 'completed' and due_date > p_today)
  )
  from public.cases
$$;

create or replace function public.get_cases_by_type()
returns table (name text, slug text, total bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select ct.name, ct.slug, count(c.id) as total
    from public.case_types ct
    left join public.cases c on c.case_type_id = ct.id and c.status <> 'archived'
   where ct.is_active
   group by ct.id
   order by ct.sort_order, ct.name
$$;

-- Database overview for the administrator "System" page
create or replace function public.get_system_info()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.has_role('administrator') then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'postgres_version', current_setting('server_version'),
    'database_size', pg_size_pretty(pg_database_size(current_database())),
    'counts', jsonb_build_object(
      'profiles', (select count(*) from public.profiles),
      'cases', (select count(*) from public.cases),
      'people', (select count(*) from public.people),
      'events', (select count(*) from public.events),
      'tasks', (select count(*) from public.tasks),
      'documents', (select count(*) from public.case_documents),
      'notifications', (select count(*) from public.notifications),
      'activity_logs', (select count(*) from public.activity_logs)
    )
  );
end;
$$;
