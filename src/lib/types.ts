// Row types for the tables and views in supabase/migrations.
// Keep these in sync with the schema (or replace with `supabase gen types`).
import type {
  CasePriority,
  CaseStatus,
  DocumentCategory,
  EventStatus,
  EventType,
  PartyRole,
  TaskPriority,
  TaskStatus,
  UserRole,
} from "@/lib/constants"

export type Profile = {
  id: string
  full_name: string
  email: string
  role: UserRole
  avatar_url: string | null
  department_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type ProfileOption = Pick<Profile, "id" | "full_name" | "role">

export type EmailChangeRequest = {
  id: string
  user_id: string
  current_email: string
  new_email: string
  reason: string | null
  status: "pending" | "approved" | "rejected" | "cancelled"
  review_note: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  user?: Pick<Profile, "full_name" | "avatar_url" | "role"> | null
  reviewer?: Pick<Profile, "full_name"> | null
}

export type UserSettings = {
  user_id: string
  hearing_reminders: boolean
  deadline_reminders: boolean
  task_reminders: boolean
  case_updates: boolean
  email_notifications: boolean
  in_app_notifications: boolean
  default_calendar_view: "month" | "week" | "day"
  working_hours_start: string
  working_hours_end: string
  default_reminder_minutes: number
}

export type CaseType = {
  id: string
  name: string
  slug: string
  description: string | null
  sort_order: number
  is_active: boolean
}

export type Department = { id: string; name: string }
export type Location = { id: string; name: string; address: string | null }
export type Tag = { id: string; name: string }

export type Lookups = {
  caseTypes: CaseType[]
  departments: Department[]
  locations: Location[]
  staff: ProfileOption[]
}

export type CaseRow = {
  id: string
  case_number: string
  title: string
  description: string | null
  case_type_id: string
  status: CaseStatus
  priority: CasePriority
  date_filed: string
  deadline: string | null
  resolution_date: string | null
  assigned_to: string | null
  department_id: string | null
  location_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

/** Row from the `case_list` view */
export type CaseListItem = CaseRow & {
  case_type_name: string
  case_type_slug: string
  assigned_to_name: string | null
  department_name: string | null
  location_name: string | null
  complainants: string | null
  defendants: string | null
  next_hearing: string | null
}

export type Person = {
  id: string
  first_name: string
  middle_name: string | null
  last_name: string
  suffix: string | null
  full_name: string
  primary_role: PartyRole
  gender: string | null
  date_of_birth: string | null
  address: string | null
  contact_number: string | null
  email: string | null
  occupation: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

/** Row from the `people_list` view */
export type PersonListItem = Person & {
  case_count: number
  case_types: string[]
  case_roles: PartyRole[]
}

export type PersonOption = Pick<Person, "id" | "full_name" | "primary_role">

export type CaseParty = {
  id: string
  case_id: string
  person_id: string
  role: PartyRole
  person: Pick<Person, "id" | "full_name" | "contact_number" | "email" | "address">
}

export type Note = {
  id: string
  body: string
  created_at: string
  created_by: string | null
  author: { full_name: string } | null
}

export type CaseDocument = {
  id: string
  case_id: string
  document_name: string
  category: DocumentCategory
  file_path: string
  file_type: string | null
  file_size: number | null
  uploaded_by: string | null
  created_at: string
  uploader: { full_name: string } | null
}

export type CalendarEvent = {
  id: string
  title: string
  event_type: EventType
  subtype: string | null
  status: EventStatus
  starts_at: string
  ends_at: string | null
  all_day: boolean
  location: string | null
  description: string | null
  case_id: string | null
  reminder_minutes: number | null
  created_by: string | null
  case: { id: string; case_number: string; title: string } | null
  participants: { person: { id: string; full_name: string } }[]
}

export type Task = {
  id: string
  title: string
  description: string | null
  due_date: string | null
  priority: TaskPriority
  status: TaskStatus
  assigned_to: string | null
  case_id: string | null
  completed_at: string | null
  created_by: string | null
  created_at: string
  assignee: { id: string; full_name: string } | null
  case: { id: string; case_number: string; title: string } | null
}

export type NotificationType = "hearing" | "task" | "deadline" | "case" | "system"

export type AppNotification = {
  id: string
  title: string
  message: string
  type: NotificationType
  is_read: boolean
  related_case_id: string | null
  link: string | null
  created_at: string
}

export type ActivityLog = {
  id: string
  user_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  case_id: string | null
  description: string
  created_at: string
  user: { full_name: string } | null
}

export type CaseOption = { id: string; case_number: string; title: string }
