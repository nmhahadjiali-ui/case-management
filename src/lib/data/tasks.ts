import "server-only"
import { createClient } from "@/lib/supabase/server"
import { addDaysKey, todayKey } from "@/lib/datetime"
import { TASK_FILTERS, TASK_PRIORITIES, type TaskFilter } from "@/lib/constants"
import { sanitizeSearch } from "@/lib/data/cases"
import type { Task } from "@/lib/types"

export type { TaskFilter }

export type TaskFilters = { filter: TaskFilter; q: string; priority: string; assignee: string }

type RawParams = Record<string, string | string[] | undefined>
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ""

export function parseTaskFilters(params: RawParams): TaskFilters {
  const filter = first(params.filter)
  const priority = first(params.priority)
  return {
    filter: (TASK_FILTERS.some((f) => f.value === filter) ? filter : "all") as TaskFilter,
    q: first(params.q).trim().slice(0, 100),
    priority: TASK_PRIORITIES.some((p) => p.value === priority) ? priority : "",
    assignee: first(params.assignee),
  }
}

export const TASK_SELECT =
  "*, assignee:profiles!tasks_assigned_to_fkey(id, full_name), case:cases(id, case_number, title)"

export async function listTasks(filters: TaskFilters, currentUserId: string) {
  const supabase = await createClient()
  const today = todayKey()
  let query = supabase.from("tasks").select(TASK_SELECT)

  switch (filters.filter) {
    case "mine":
      query = query.eq("assigned_to", currentUserId)
      break
    case "pending":
      query = query.neq("status", "completed")
      break
    case "completed":
      query = query.eq("status", "completed")
      break
    case "overdue":
      query = query.neq("status", "completed").lt("due_date", today)
      break
    case "today":
      query = query.neq("status", "completed").eq("due_date", today)
      break
    case "week":
      query = query.neq("status", "completed").gte("due_date", today).lte("due_date", addDaysKey(today, 7))
      break
  }
  if (filters.priority) query = query.eq("priority", filters.priority)
  if (filters.assignee) query = query.eq("assigned_to", filters.assignee)
  const q = sanitizeSearch(filters.q)
  if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`)

  const { data, error } = await query
    .order("status", { ascending: true })
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(500)
  if (error) {
    console.error("[listTasks]", error.message)
    throw new Error("Failed to load tasks")
  }
  return (data ?? []) as unknown as Task[]
}

/** Counts per quick filter, for the filter tabs. */
export async function getTaskCounts(currentUserId: string) {
  const supabase = await createClient()
  const today = todayKey()
  const count = (q: PromiseLike<{ count: number | null }>) => q.then((r) => r.count ?? 0)
  const base = () => supabase.from("tasks").select("id", { count: "exact", head: true })
  const [all, mine, pending, completed, overdue, dueToday, week] = await Promise.all([
    count(base()),
    count(base().eq("assigned_to", currentUserId)),
    count(base().neq("status", "completed")),
    count(base().eq("status", "completed")),
    count(base().neq("status", "completed").lt("due_date", today)),
    count(base().neq("status", "completed").eq("due_date", today)),
    count(base().neq("status", "completed").gte("due_date", today).lte("due_date", addDaysKey(today, 7))),
  ])
  return { all, mine, pending, completed, overdue, today: dueToday, week } satisfies Record<TaskFilter, number>
}
