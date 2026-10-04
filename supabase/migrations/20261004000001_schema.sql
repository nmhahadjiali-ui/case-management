-- =============================================================================
-- Case Management System — core schema
-- =============================================================================
-- Design notes
--   * Statuses and priorities are Postgres enums: application logic (dashboard
--     counts, badges, filters) depends on their exact values.
--   * Case types, departments, locations and tags are lookup tables that
--     administrators can manage from Settings.
--   * Hearings, conferences, deadlines, appointments and meetings all live in a
--     single `events` table (event_type = 'hearing', ...). A case's "next
--     hearing" is derived from it, so it is never stored twice.
--   * A user's role lives on `profiles.role` (one role per user).
-- =============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('administrator', 'case_manager', 'staff', 'viewer');
create type public.case_status as enum ('new', 'active', 'pending', 'hearing', 'on_hold', 'closed', 'archived');
create type public.case_priority as enum ('low', 'normal', 'high', 'urgent');
create type public.party_role as enum ('complainant', 'defendant', 'witness', 'lawyer', 'representative', 'other');
create type public.event_type as enum ('hearing', 'conference', 'deadline', 'appointment', 'meeting', 'other');
create type public.event_status as enum ('scheduled', 'completed', 'postponed', 'cancelled');
create type public.task_priority as enum ('low', 'medium', 'high', 'urgent');
create type public.task_status as enum ('pending', 'in_progress', 'completed');
create type public.document_category as enum ('complaint', 'affidavit', 'certification', 'order', 'decision', 'evidence', 'other');
create type public.notification_type as enum ('hearing', 'task', 'deadline', 'case', 'system');

-- ---------------------------------------------------------------------------
-- Shared trigger: keep updated_at current
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Lookup tables
-- ---------------------------------------------------------------------------
create table public.case_types (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique check (char_length(name) between 1 and 80),
  slug        text not null unique check (slug ~ '^[a-z0-9-]+$'),
  description text,
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table public.departments (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique check (char_length(name) between 1 and 120),
  created_at timestamptz not null default now()
);

create table public.locations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique check (char_length(name) between 1 and 160),
  address    text,
  created_at timestamptz not null default now()
);

create table public.tags (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique check (char_length(name) between 1 and 40),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  full_name     text not null default '',
  email         text not null,
  role          public.user_role not null default 'viewer',
  avatar_url    text,
  department_id uuid references public.departments (id) on delete set null,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Per-user preferences (appearance, notifications, calendar)
create table public.user_settings (
  user_id                  uuid primary key references public.profiles (id) on delete cascade,
  hearing_reminders        boolean not null default true,
  deadline_reminders       boolean not null default true,
  task_reminders           boolean not null default true,
  case_updates             boolean not null default true,
  email_notifications      boolean not null default false,
  in_app_notifications     boolean not null default true,
  default_calendar_view    text not null default 'month' check (default_calendar_view in ('month', 'week', 'day')),
  working_hours_start      time not null default '08:00',
  working_hours_end        time not null default '17:00',
  default_reminder_minutes int not null default 60 check (default_reminder_minutes between 0 and 10080),
  updated_at               timestamptz not null default now()
);

create trigger user_settings_updated_at before update on public.user_settings
  for each row execute function public.set_updated_at();

-- Organisation-wide settings (key/value), e.g. the oath text
create table public.app_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

-- Create a profile + settings row whenever a new auth user is created.
-- The very first user becomes the administrator so the system can be bootstrapped.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role;
begin
  if exists (select 1 from public.profiles where role = 'administrator') then
    v_role := coalesce(
      nullif(new.raw_user_meta_data ->> 'role', '')::public.user_role,
      'viewer'
    );
  else
    v_role := 'administrator';
  end if;

  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
    new.email,
    v_role
  );

  insert into public.user_settings (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep profiles.email in sync when the auth email changes
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- ---------------------------------------------------------------------------
-- Role helpers (used by RLS policies)
-- ---------------------------------------------------------------------------
-- Returns the role of the signed-in user, or NULL if the account is inactive.
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and is_active
$$;

create or replace function public.has_role(variadic roles public.user_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = any (roles), false)
$$;

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() is not null
$$;

-- Non-administrators may edit their own profile, but never their role or status.
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.has_role('administrator') then
    if new.role is distinct from old.role
       or new.is_active is distinct from old.is_active
       or new.email is distinct from old.email then
      raise exception 'Not allowed to change role, status or email'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_protect_fields before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- ---------------------------------------------------------------------------
-- People
-- ---------------------------------------------------------------------------
create table public.people (
  id             uuid primary key default gen_random_uuid(),
  first_name     text not null check (char_length(first_name) between 1 and 80),
  middle_name    text,
  last_name      text not null check (char_length(last_name) between 1 and 80),
  suffix         text,
  full_name      text generated always as (
                   trim(first_name
                        || coalesce(' ' || nullif(trim(middle_name), ''), '')
                        || ' ' || last_name
                        || coalesce(' ' || nullif(trim(suffix), ''), ''))
                 ) stored,
  primary_role   public.party_role not null default 'other',
  gender         text check (gender in ('male', 'female', 'other', 'prefer_not_to_say')),
  date_of_birth  date,
  address        text,
  contact_number text,
  email          text,
  occupation     text,
  is_active      boolean not null default true,
  created_by     uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index people_full_name_idx on public.people using btree (lower(full_name));
create trigger people_updated_at before update on public.people
  for each row execute function public.set_updated_at();

create table public.person_notes (
  id         uuid primary key default gen_random_uuid(),
  person_id  uuid not null references public.people (id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 5000),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index person_notes_person_idx on public.person_notes (person_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Cases
-- ---------------------------------------------------------------------------
create table public.cases (
  id              uuid primary key default gen_random_uuid(),
  case_number     text not null unique check (char_length(case_number) between 1 and 50),
  title           text not null check (char_length(title) between 1 and 200),
  description     text,
  case_type_id    uuid not null references public.case_types (id),
  status          public.case_status not null default 'new',
  priority        public.case_priority not null default 'normal',
  date_filed      date not null default current_date,
  deadline        date,
  resolution_date date,
  assigned_to     uuid references public.profiles (id) on delete set null,
  department_id   uuid references public.departments (id) on delete set null,
  location_id     uuid references public.locations (id) on delete set null,
  created_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index cases_status_idx on public.cases (status);
create index cases_type_idx on public.cases (case_type_id);
create index cases_assigned_idx on public.cases (assigned_to);
create index cases_deadline_idx on public.cases (deadline);
create index cases_updated_idx on public.cases (updated_at desc);
create trigger cases_updated_at before update on public.cases
  for each row execute function public.set_updated_at();

-- Junction: people <-> cases with a role
create table public.case_parties (
  id         uuid primary key default gen_random_uuid(),
  case_id    uuid not null references public.cases (id) on delete cascade,
  person_id  uuid not null references public.people (id) on delete cascade,
  role       public.party_role not null,
  created_at timestamptz not null default now(),
  unique (case_id, person_id, role)
);
create index case_parties_person_idx on public.case_parties (person_id);

create table public.case_tags (
  case_id uuid not null references public.cases (id) on delete cascade,
  tag_id  uuid not null references public.tags (id) on delete cascade,
  primary key (case_id, tag_id)
);

create table public.case_notes (
  id         uuid primary key default gen_random_uuid(),
  case_id    uuid not null references public.cases (id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 5000),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index case_notes_case_idx on public.case_notes (case_id, created_at desc);

create table public.case_documents (
  id            uuid primary key default gen_random_uuid(),
  case_id       uuid not null references public.cases (id) on delete cascade,
  document_name text not null check (char_length(document_name) between 1 and 255),
  category      public.document_category not null default 'other',
  file_path     text not null unique,
  file_type     text,
  file_size     bigint check (file_size >= 0),
  uploaded_by   uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now()
);
create index case_documents_case_idx on public.case_documents (case_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Events (hearings, conferences, deadlines, appointments, meetings)
-- ---------------------------------------------------------------------------
create table public.events (
  id               uuid primary key default gen_random_uuid(),
  title            text not null check (char_length(title) between 1 and 200),
  event_type       public.event_type not null default 'other',
  subtype          text,               -- e.g. "Pre-trial", "Mediation" for hearings
  status           public.event_status not null default 'scheduled',
  starts_at        timestamptz not null,
  ends_at          timestamptz,
  all_day          boolean not null default false,
  location         text,
  description      text,
  case_id          uuid references public.cases (id) on delete cascade,
  reminder_minutes int check (reminder_minutes between 0 and 10080),
  created_by       uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);
create index events_starts_idx on public.events (starts_at);
create index events_case_idx on public.events (case_id);
create trigger events_updated_at before update on public.events
  for each row execute function public.set_updated_at();

create table public.event_participants (
  event_id  uuid not null references public.events (id) on delete cascade,
  person_id uuid not null references public.people (id) on delete cascade,
  primary key (event_id, person_id)
);

-- ---------------------------------------------------------------------------
-- Tasks
-- ---------------------------------------------------------------------------
create table public.tasks (
  id           uuid primary key default gen_random_uuid(),
  title        text not null check (char_length(title) between 1 and 200),
  description  text,
  due_date     date,
  priority     public.task_priority not null default 'medium',
  status       public.task_status not null default 'pending',
  assigned_to  uuid references public.profiles (id) on delete set null,
  case_id      uuid references public.cases (id) on delete cascade,
  completed_at timestamptz,
  created_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index tasks_due_idx on public.tasks (due_date);
create index tasks_assigned_idx on public.tasks (assigned_to);
create index tasks_case_idx on public.tasks (case_id);
create trigger tasks_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();

-- Keep completed_at consistent with status
create or replace function public.sync_task_completed_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'completed' and (tg_op = 'INSERT' or old.status <> 'completed') then
    new.completed_at = now();
  elsif new.status <> 'completed' then
    new.completed_at = null;
  end if;
  return new;
end;
$$;

create trigger tasks_completed_at before insert or update on public.tasks
  for each row execute function public.sync_task_completed_at();

-- ---------------------------------------------------------------------------
-- Notifications & activity log
-- ---------------------------------------------------------------------------
create table public.notifications (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id) on delete cascade,
  title           text not null,
  message         text not null default '',
  type            public.notification_type not null default 'system',
  is_read         boolean not null default false,
  related_case_id uuid references public.cases (id) on delete cascade,
  link            text,
  dedupe_key      text,   -- prevents duplicate time-based reminders
  created_at      timestamptz not null default now(),
  unique (user_id, dedupe_key)
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

create table public.activity_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles (id) on delete set null,
  action      text not null,          -- e.g. 'case.created', 'task.completed'
  entity_type text not null,          -- e.g. 'case', 'person', 'task'
  entity_id   uuid,
  case_id     uuid references public.cases (id) on delete set null,
  description text not null,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index activity_logs_created_idx on public.activity_logs (created_at desc);
create index activity_logs_case_idx on public.activity_logs (case_id, created_at desc);
create index activity_logs_entity_idx on public.activity_logs (entity_type, entity_id);
