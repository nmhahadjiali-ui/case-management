-- =============================================================================
-- Row Level Security
-- =============================================================================
-- Role matrix
--   administrator : full access, manages users, lookups and settings
--   case_manager  : create/update/delete cases, people, events, tasks, documents
--   staff         : create & update records; may only update cases assigned to them;
--                   may delete only what they created (events, tasks, notes, documents)
--   viewer        : read-only (plus their own notifications/settings/profile)
-- Inactive users (profiles.is_active = false) get no access at all.
-- =============================================================================

alter table public.case_types         enable row level security;
alter table public.departments        enable row level security;
alter table public.locations          enable row level security;
alter table public.tags               enable row level security;
alter table public.profiles           enable row level security;
alter table public.user_settings      enable row level security;
alter table public.app_settings       enable row level security;
alter table public.people             enable row level security;
alter table public.person_notes       enable row level security;
alter table public.cases              enable row level security;
alter table public.case_parties       enable row level security;
alter table public.case_tags          enable row level security;
alter table public.case_notes         enable row level security;
alter table public.case_documents     enable row level security;
alter table public.events             enable row level security;
alter table public.event_participants enable row level security;
alter table public.tasks              enable row level security;
alter table public.notifications      enable row level security;
alter table public.activity_logs      enable row level security;

-- ---------------------------------------------------------------------------
-- Lookup tables: everyone active can read; administrators manage.
-- Tags can also be created by anyone who can edit cases (free-form tagging).
-- ---------------------------------------------------------------------------
create policy "lookup read" on public.case_types for select to authenticated using (public.is_active_user());
create policy "lookup admin" on public.case_types for all to authenticated
  using (public.has_role('administrator')) with check (public.has_role('administrator'));

create policy "lookup read" on public.departments for select to authenticated using (public.is_active_user());
create policy "lookup admin" on public.departments for all to authenticated
  using (public.has_role('administrator')) with check (public.has_role('administrator'));

create policy "lookup read" on public.locations for select to authenticated using (public.is_active_user());
create policy "lookup admin" on public.locations for all to authenticated
  using (public.has_role('administrator')) with check (public.has_role('administrator'));

create policy "lookup read" on public.tags for select to authenticated using (public.is_active_user());
create policy "tags insert" on public.tags for insert to authenticated
  with check (public.has_role('administrator', 'case_manager', 'staff'));
create policy "tags admin update" on public.tags for update to authenticated
  using (public.has_role('administrator')) with check (public.has_role('administrator'));
create policy "tags admin delete" on public.tags for delete to authenticated
  using (public.has_role('administrator'));

-- ---------------------------------------------------------------------------
-- Profiles & settings
-- ---------------------------------------------------------------------------
-- Active users may read their own profile even before activation checks,
-- so the app can show a "your account is deactivated" message.
create policy "profiles read" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_active_user());
create policy "profiles update self" on public.profiles for update to authenticated
  using (id = auth.uid() and public.is_active_user()) with check (id = auth.uid());
create policy "profiles admin update" on public.profiles for update to authenticated
  using (public.has_role('administrator')) with check (public.has_role('administrator'));

create policy "settings own" on public.user_settings for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "app settings read" on public.app_settings for select to authenticated using (public.is_active_user());
create policy "app settings admin" on public.app_settings for all to authenticated
  using (public.has_role('administrator')) with check (public.has_role('administrator'));

-- ---------------------------------------------------------------------------
-- People
-- ---------------------------------------------------------------------------
create policy "people read" on public.people for select to authenticated using (public.is_active_user());
create policy "people insert" on public.people for insert to authenticated
  with check (public.has_role('administrator', 'case_manager', 'staff'));
create policy "people update" on public.people for update to authenticated
  using (public.has_role('administrator', 'case_manager', 'staff'))
  with check (public.has_role('administrator', 'case_manager', 'staff'));
create policy "people delete" on public.people for delete to authenticated
  using (public.has_role('administrator', 'case_manager'));

create policy "person notes read" on public.person_notes for select to authenticated using (public.is_active_user());
create policy "person notes insert" on public.person_notes for insert to authenticated
  with check (public.has_role('administrator', 'case_manager', 'staff') and created_by = auth.uid());
create policy "person notes delete" on public.person_notes for delete to authenticated
  using (created_by = auth.uid() or public.has_role('administrator', 'case_manager'));

-- ---------------------------------------------------------------------------
-- Cases and case children
-- ---------------------------------------------------------------------------
-- Can the current user edit this case (and therefore its parties/tags)?
create or replace function public.can_edit_case(p_case_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('administrator', 'case_manager')
      or (public.has_role('staff') and exists (
            select 1 from public.cases
             where id = p_case_id and (assigned_to = auth.uid() or created_by = auth.uid())))
$$;

create policy "cases read" on public.cases for select to authenticated using (public.is_active_user());
create policy "cases insert" on public.cases for insert to authenticated
  with check (public.has_role('administrator', 'case_manager', 'staff') and created_by = auth.uid());
create policy "cases update" on public.cases for update to authenticated
  using (public.can_edit_case(id)) with check (public.has_role('administrator', 'case_manager', 'staff'));
create policy "cases delete" on public.cases for delete to authenticated
  using (public.has_role('administrator', 'case_manager'));

create policy "parties read" on public.case_parties for select to authenticated using (public.is_active_user());
create policy "parties insert" on public.case_parties for insert to authenticated with check (public.can_edit_case(case_id));
create policy "parties update" on public.case_parties for update to authenticated
  using (public.can_edit_case(case_id)) with check (public.can_edit_case(case_id));
create policy "parties delete" on public.case_parties for delete to authenticated using (public.can_edit_case(case_id));

create policy "case tags read" on public.case_tags for select to authenticated using (public.is_active_user());
create policy "case tags insert" on public.case_tags for insert to authenticated with check (public.can_edit_case(case_id));
create policy "case tags delete" on public.case_tags for delete to authenticated using (public.can_edit_case(case_id));

create policy "case notes read" on public.case_notes for select to authenticated using (public.is_active_user());
create policy "case notes insert" on public.case_notes for insert to authenticated
  with check (public.has_role('administrator', 'case_manager', 'staff') and created_by = auth.uid());
create policy "case notes delete" on public.case_notes for delete to authenticated
  using (created_by = auth.uid() or public.has_role('administrator', 'case_manager'));

create policy "documents read" on public.case_documents for select to authenticated using (public.is_active_user());
create policy "documents insert" on public.case_documents for insert to authenticated
  with check (public.has_role('administrator', 'case_manager', 'staff') and uploaded_by = auth.uid());
create policy "documents delete" on public.case_documents for delete to authenticated
  using (uploaded_by = auth.uid() or public.has_role('administrator', 'case_manager'));

-- ---------------------------------------------------------------------------
-- Events & tasks
-- ---------------------------------------------------------------------------
create policy "events read" on public.events for select to authenticated using (public.is_active_user());
create policy "events insert" on public.events for insert to authenticated
  with check (public.has_role('administrator', 'case_manager', 'staff') and created_by = auth.uid());
create policy "events update" on public.events for update to authenticated
  using (public.has_role('administrator', 'case_manager') or (public.has_role('staff') and created_by = auth.uid()))
  with check (public.has_role('administrator', 'case_manager', 'staff'));
create policy "events delete" on public.events for delete to authenticated
  using (public.has_role('administrator', 'case_manager') or (public.has_role('staff') and created_by = auth.uid()));

create policy "participants read" on public.event_participants for select to authenticated using (public.is_active_user());
create policy "participants write" on public.event_participants for all to authenticated
  using (exists (select 1 from public.events e where e.id = event_id
                  and (public.has_role('administrator', 'case_manager') or (public.has_role('staff') and e.created_by = auth.uid()))))
  with check (exists (select 1 from public.events e where e.id = event_id
                  and (public.has_role('administrator', 'case_manager') or (public.has_role('staff') and e.created_by = auth.uid()))));

create policy "tasks read" on public.tasks for select to authenticated using (public.is_active_user());
create policy "tasks insert" on public.tasks for insert to authenticated
  with check (public.has_role('administrator', 'case_manager', 'staff') and created_by = auth.uid());
create policy "tasks update" on public.tasks for update to authenticated
  using (public.has_role('administrator', 'case_manager')
         or (public.has_role('staff') and (created_by = auth.uid() or assigned_to = auth.uid())))
  with check (public.has_role('administrator', 'case_manager', 'staff'));
create policy "tasks delete" on public.tasks for delete to authenticated
  using (public.has_role('administrator', 'case_manager') or (public.has_role('staff') and created_by = auth.uid()));

-- ---------------------------------------------------------------------------
-- Notifications: strictly private. Rows are created by definer functions only.
-- ---------------------------------------------------------------------------
create policy "notifications own read" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "notifications own update" on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notifications own delete" on public.notifications for delete to authenticated using (user_id = auth.uid());

-- Users may only flip is_read on their notifications, not rewrite them.
revoke update on public.notifications from authenticated;
grant update (is_read) on public.notifications to authenticated;

-- ---------------------------------------------------------------------------
-- Activity log: append-only, written by triggers. Sign-in records are visible
-- to administrators (and the user themselves); everything else to all active users.
-- ---------------------------------------------------------------------------
create policy "activity read" on public.activity_logs for select to authenticated
  using (public.is_active_user()
         and (entity_type <> 'user' or user_id = auth.uid() or public.has_role('administrator')));

-- ---------------------------------------------------------------------------
-- Function privileges
-- ---------------------------------------------------------------------------
revoke execute on function public.get_system_info() from public, anon;
revoke execute on function public.generate_my_reminders(text) from public, anon;
revoke execute on function public.log_login() from public, anon;
grant execute on function public.get_system_info() to authenticated;
grant execute on function public.generate_my_reminders(text) to authenticated;
grant execute on function public.log_login() to authenticated;
