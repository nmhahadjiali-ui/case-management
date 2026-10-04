// Shared option lists, labels and badge colours.
// Values match the Postgres enums in supabase/migrations.

export const APP_NAME = "CaseFlow"
export const APP_TAGLINE = "Case Management System"

export type Option<T extends string = string> = { value: T; label: string }

export const USER_ROLES = [
  { value: "administrator", label: "Administrator" },
  { value: "case_manager", label: "Case Manager" },
  { value: "staff", label: "Staff" },
  { value: "viewer", label: "Viewer" },
] as const satisfies readonly Option[]
export type UserRole = (typeof USER_ROLES)[number]["value"]

export const CASE_STATUSES = [
  { value: "new", label: "New" },
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending" },
  { value: "hearing", label: "Hearing" },
  { value: "on_hold", label: "On Hold" },
  { value: "closed", label: "Closed" },
  { value: "archived", label: "Archived" },
] as const satisfies readonly Option[]
export type CaseStatus = (typeof CASE_STATUSES)[number]["value"]

export const CASE_PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
] as const satisfies readonly Option[]
export type CasePriority = (typeof CASE_PRIORITIES)[number]["value"]

export const PARTY_ROLES = [
  { value: "complainant", label: "Complainant" },
  { value: "defendant", label: "Defendant" },
  { value: "witness", label: "Witness" },
  { value: "lawyer", label: "Lawyer" },
  { value: "representative", label: "Representative" },
  { value: "other", label: "Other" },
] as const satisfies readonly Option[]
export type PartyRole = (typeof PARTY_ROLES)[number]["value"]

export const EVENT_TYPES = [
  { value: "hearing", label: "Hearing" },
  { value: "conference", label: "Conference" },
  { value: "deadline", label: "Deadline" },
  { value: "appointment", label: "Appointment" },
  { value: "meeting", label: "Meeting" },
  { value: "other", label: "Other" },
] as const satisfies readonly Option[]
export type EventType = (typeof EVENT_TYPES)[number]["value"]

export const EVENT_STATUSES = [
  { value: "scheduled", label: "Scheduled" },
  { value: "completed", label: "Completed" },
  { value: "postponed", label: "Postponed" },
  { value: "cancelled", label: "Cancelled" },
] as const satisfies readonly Option[]
export type EventStatus = (typeof EVENT_STATUSES)[number]["value"]

export const TASK_PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
] as const satisfies readonly Option[]
export type TaskPriority = (typeof TASK_PRIORITIES)[number]["value"]

export const TASK_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
] as const satisfies readonly Option[]
export type TaskStatus = (typeof TASK_STATUSES)[number]["value"]

export const TASK_FILTERS = [
  { value: "all", label: "All" },
  { value: "mine", label: "My Tasks" },
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
  { value: "overdue", label: "Overdue" },
  { value: "today", label: "Due Today" },
  { value: "week", label: "Due This Week" },
] as const
export type TaskFilter = (typeof TASK_FILTERS)[number]["value"]

export const DOCUMENT_CATEGORIES = [
  { value: "complaint", label: "Complaint" },
  { value: "affidavit", label: "Affidavit" },
  { value: "certification", label: "Certification" },
  { value: "order", label: "Order" },
  { value: "decision", label: "Decision" },
  { value: "evidence", label: "Evidence" },
  { value: "other", label: "Other" },
] as const satisfies readonly Option[]
export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number]["value"]

export const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
] as const satisfies readonly Option[]

export const REMINDER_OPTIONS = [
  { value: "", label: "No reminder" },
  { value: "15", label: "15 minutes before" },
  { value: "30", label: "30 minutes before" },
  { value: "60", label: "1 hour before" },
  { value: "1440", label: "1 day before" },
  { value: "2880", label: "2 days before" },
] as const satisfies readonly Option[]

export const PAGE_SIZES = [10, 20, 50, 100] as const

/** Look up the display label for an enum value. */
export function labelOf(options: readonly Option[], value: string | null | undefined) {
  if (!value) return "—"
  return options.find((o) => o.value === value)?.label ?? value
}

// Badge colours (subtle tinted backgrounds, readable in light and dark mode)
const tone = {
  gray: "bg-muted text-muted-foreground border-border",
  blue: "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-300",
  green: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300",
  amber: "bg-amber-500/10 text-amber-700 border-amber-500/25 dark:text-amber-300",
  orange: "bg-orange-500/10 text-orange-700 border-orange-500/25 dark:text-orange-300",
  red: "bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-300",
  violet: "bg-violet-500/10 text-violet-700 border-violet-500/20 dark:text-violet-300",
  cyan: "bg-cyan-500/10 text-cyan-700 border-cyan-500/20 dark:text-cyan-300",
} as const

export const CASE_STATUS_TONE: Record<CaseStatus, string> = {
  new: tone.blue,
  active: tone.green,
  pending: tone.amber,
  hearing: tone.violet,
  on_hold: tone.orange,
  closed: tone.gray,
  archived: tone.gray,
}

export const PRIORITY_TONE: Record<CasePriority | TaskPriority, string> = {
  low: tone.gray,
  normal: tone.blue,
  medium: tone.blue,
  high: tone.orange,
  urgent: tone.red,
}

export const TASK_STATUS_TONE: Record<TaskStatus, string> = {
  pending: tone.amber,
  in_progress: tone.blue,
  completed: tone.green,
}

export const EVENT_STATUS_TONE: Record<EventStatus, string> = {
  scheduled: tone.blue,
  completed: tone.green,
  postponed: tone.amber,
  cancelled: tone.gray,
}

/** Calendar colours per event type: [dot/bar colour, chip classes] */
export const EVENT_TYPE_STYLE: Record<EventType, { dot: string; chip: string }> = {
  hearing: { dot: "bg-violet-500", chip: tone.violet },
  conference: { dot: "bg-blue-500", chip: tone.blue },
  deadline: { dot: "bg-red-500", chip: tone.red },
  appointment: { dot: "bg-emerald-500", chip: tone.green },
  meeting: { dot: "bg-cyan-500", chip: tone.cyan },
  other: { dot: "bg-slate-400", chip: tone.gray },
}

export const ROLE_TONE: Record<UserRole, string> = {
  administrator: tone.violet,
  case_manager: tone.blue,
  staff: tone.green,
  viewer: tone.gray,
}
