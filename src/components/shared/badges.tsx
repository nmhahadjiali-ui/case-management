import { cn } from "@/lib/utils"
import {
  CASE_PRIORITIES,
  CASE_STATUSES,
  CASE_STATUS_TONE,
  EVENT_STATUSES,
  EVENT_STATUS_TONE,
  EVENT_TYPES,
  EVENT_TYPE_STYLE,
  PARTY_ROLES,
  PRIORITY_TONE,
  ROLE_TONE,
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_STATUS_TONE,
  USER_ROLES,
  labelOf,
  type CasePriority,
  type CaseStatus,
  type EventStatus,
  type EventType,
  type TaskPriority,
  type TaskStatus,
  type UserRole,
} from "@/lib/constants"

function Pill({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-1 rounded-full border px-2 text-xs font-medium whitespace-nowrap",
        className
      )}
    >
      {children}
    </span>
  )
}

export function CaseStatusBadge({ status }: { status: CaseStatus }) {
  return <Pill className={CASE_STATUS_TONE[status]}>{labelOf(CASE_STATUSES, status)}</Pill>
}

export function CasePriorityBadge({ priority }: { priority: CasePriority }) {
  return <Pill className={PRIORITY_TONE[priority]}>{labelOf(CASE_PRIORITIES, priority)}</Pill>
}

export function TaskPriorityBadge({ priority }: { priority: TaskPriority }) {
  return <Pill className={PRIORITY_TONE[priority]}>{labelOf(TASK_PRIORITIES, priority)}</Pill>
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return <Pill className={TASK_STATUS_TONE[status]}>{labelOf(TASK_STATUSES, status)}</Pill>
}

export function EventTypeBadge({ type }: { type: EventType }) {
  return (
    <Pill className={EVENT_TYPE_STYLE[type].chip}>
      <span className={cn("size-1.5 rounded-full", EVENT_TYPE_STYLE[type].dot)} aria-hidden />
      {labelOf(EVENT_TYPES, type)}
    </Pill>
  )
}

export function EventStatusBadge({ status }: { status: EventStatus }) {
  return <Pill className={EVENT_STATUS_TONE[status]}>{labelOf(EVENT_STATUSES, status)}</Pill>
}

export function UserRoleBadge({ role }: { role: UserRole }) {
  return <Pill className={ROLE_TONE[role]}>{labelOf(USER_ROLES, role)}</Pill>
}

export function PartyRoleBadge({ role }: { role: string }) {
  return <Pill className="border-border bg-muted text-foreground">{labelOf(PARTY_ROLES, role)}</Pill>
}

export { Pill }
