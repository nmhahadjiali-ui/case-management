"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { requireSession } from "@/lib/auth"
import { canWrite } from "@/lib/permissions"
import { denied, fail, invalid, type ActionResult } from "@/lib/action-result"
import { taskSchema, type TaskInput } from "@/lib/validations/task"
import { nullIfEmpty } from "@/lib/validations/helpers"
import { TASK_PRIORITIES } from "@/lib/constants"

function taskRow(v: TaskInput) {
  return {
    title: v.title,
    description: nullIfEmpty(v.description),
    due_date: nullIfEmpty(v.due_date),
    priority: v.priority,
    status: v.status,
    assigned_to: nullIfEmpty(v.assigned_to),
    case_id: nullIfEmpty(v.case_id),
  }
}

function revalidateTasks(caseId?: string | null) {
  revalidatePath("/tasks")
  revalidatePath("/dashboard")
  if (caseId) revalidatePath(`/cases/${caseId}`)
}

export async function createTask(values: TaskInput): Promise<ActionResult<{ id: string }>> {
  const session = await requireSession()
  if (!canWrite(session.profile.role)) return denied()
  const parsed = taskSchema.safeParse(values)
  if (!parsed.success) return invalid(parsed.error)

  const supabase = await createClient()
  const row = taskRow(parsed.data)
  const { data, error } = await supabase
    .from("tasks")
    .insert({ ...row, created_by: session.userId })
    .select("id")
    .single()
  if (error) return fail(error, "createTask")
  revalidateTasks(row.case_id)
  return { ok: true, data: { id: data.id }, message: "Task created." }
}

export async function updateTask(id: string, values: TaskInput): Promise<ActionResult<{ id: string }>> {
  const session = await requireSession()
  if (!canWrite(session.profile.role)) return denied()
  const parsed = taskSchema.safeParse(values)
  if (!parsed.success) return invalid(parsed.error)

  const supabase = await createClient()
  const row = taskRow(parsed.data)
  const { data, error } = await supabase.from("tasks").update(row).eq("id", id).select("id")
  if (error) return fail(error, "updateTask")
  if (!data?.length) return denied()
  revalidateTasks(row.case_id)
  return { ok: true, data: { id }, message: "Task updated." }
}

/** Quick edits from the task list (complete, priority, due date). */
export async function patchTask(
  id: string,
  patch: { completed?: boolean; priority?: string; due_date?: string | null }
): Promise<ActionResult> {
  const session = await requireSession()
  if (!canWrite(session.profile.role)) return denied()

  const update: Record<string, string | null> = {}
  if (patch.completed !== undefined) update.status = patch.completed ? "completed" : "pending"
  if (patch.priority !== undefined) {
    if (!TASK_PRIORITIES.some((p) => p.value === patch.priority)) return { ok: false, error: "Invalid priority." }
    update.priority = patch.priority
  }
  if (patch.due_date !== undefined) {
    if (patch.due_date !== null && !/^\d{4}-\d{2}-\d{2}$/.test(patch.due_date)) {
      return { ok: false, error: "Invalid date." }
    }
    update.due_date = patch.due_date
  }

  const supabase = await createClient()
  const { data, error } = await supabase.from("tasks").update(update).eq("id", id).select("id, case_id")
  if (error) return fail(error, "patchTask")
  if (!data?.length) return denied()
  revalidateTasks(data[0].case_id)
  return { ok: true }
}

export async function deleteTask(id: string): Promise<ActionResult> {
  await requireSession()
  const supabase = await createClient()
  const { data, error } = await supabase.from("tasks").delete().eq("id", id).select("id, case_id")
  if (error) return fail(error, "deleteTask")
  if (!data?.length) return denied()
  revalidateTasks(data[0].case_id)
  return { ok: true, message: "Task deleted." }
}
