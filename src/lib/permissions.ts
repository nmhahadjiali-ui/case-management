// Mirrors the Row Level Security rules so the UI only offers allowed actions.
// The database remains the source of truth: RLS enforces these server-side.
import type { UserRole } from "@/lib/constants"

export const isAdmin = (role: UserRole) => role === "administrator"

/** Can create/update cases, people, events, tasks, notes and documents. */
export const canWrite = (role: UserRole) => role !== "viewer"

/** Can delete cases and people, and manage any event/task/document. */
export const canManage = (role: UserRole) => role === "administrator" || role === "case_manager"

export function canEditCase(
  role: UserRole,
  userId: string,
  c: { assigned_to: string | null; created_by: string | null }
) {
  if (canManage(role)) return true
  return role === "staff" && (c.assigned_to === userId || c.created_by === userId)
}

/** Events and tasks: managers edit anything, staff edit what they created (or are assigned to, for tasks). */
export function canEditOwned(role: UserRole, userId: string, createdBy: string | null, assignedTo?: string | null) {
  if (canManage(role)) return true
  return role === "staff" && (createdBy === userId || (assignedTo != null && assignedTo === userId))
}

export function canDeleteOwned(role: UserRole, userId: string, createdBy: string | null) {
  if (canManage(role)) return true
  return role === "staff" && createdBy === userId
}
