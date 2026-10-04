import "server-only"
import { cache } from "react"
import { createClient } from "@/lib/supabase/server"
import { addDaysKey, todayKey } from "@/lib/datetime"
import { CASE_PRIORITIES, CASE_STATUSES, PAGE_SIZES } from "@/lib/constants"
import type {
  ActivityLog,
  CalendarEvent,
  CaseDocument,
  CaseListItem,
  CaseParty,
  Note,
  Tag,
  Task,
} from "@/lib/types"

export type CaseFilters = {
  q: string
  type: string
  status: string
  priority: string
  assigned: string
  from: string
  to: string
  due: string
  page: number
  per: number
}

type RawParams = Record<string, string | string[] | undefined>

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ""

/** Parse /cases?… query params into validated filters. */
export function parseCaseFilters(params: RawParams): CaseFilters {
  const status = first(params.status)
  const priority = first(params.priority)
  const per = Number(first(params.per)) || 10
  const page = Math.max(1, Number(first(params.page)) || 1)
  const date = (v: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "")
  return {
    q: first(params.q).trim().slice(0, 100),
    type: first(params.type),
    status: status === "all" || CASE_STATUSES.some((s) => s.value === status) ? status : "",
    priority: CASE_PRIORITIES.some((p) => p.value === priority) ? priority : "",
    assigned: first(params.assigned),
    from: date(first(params.from)),
    to: date(first(params.to)),
    due: ["overdue", "week"].includes(first(params.due)) ? first(params.due) : "",
    page,
    per: (PAGE_SIZES as readonly number[]).includes(per) ? per : 10,
  }
}

/** Remove characters that have meaning in PostgREST filter syntax. */
export function sanitizeSearch(q: string) {
  return q.replace(/[%,()*\\:"']/g, " ").trim()
}

export async function listCases(filters: CaseFilters, currentUserId: string) {
  const supabase = await createClient()
  const today = todayKey()

  let query = supabase.from("case_list").select("*", { count: "exact" })

  const q = sanitizeSearch(filters.q)
  if (q) {
    query = query.or(
      `case_number.ilike.%${q}%,title.ilike.%${q}%,complainants.ilike.%${q}%,defendants.ilike.%${q}%`
    )
  }
  if (filters.type) query = query.eq("case_type_slug", filters.type)
  if (filters.status && filters.status !== "all") query = query.eq("status", filters.status)
  else if (!filters.status) query = query.neq("status", "archived")
  if (filters.priority) query = query.eq("priority", filters.priority)
  if (filters.assigned === "me") query = query.eq("assigned_to", currentUserId)
  else if (filters.assigned === "unassigned") query = query.is("assigned_to", null)
  else if (filters.assigned) query = query.eq("assigned_to", filters.assigned)
  if (filters.from) query = query.gte("date_filed", filters.from)
  if (filters.to) query = query.lte("date_filed", filters.to)
  if (filters.due) {
    query = query.not("status", "in", "(closed,archived)")
    if (filters.due === "overdue") query = query.lt("deadline", today)
    else query = query.gte("deadline", today).lte("deadline", addDaysKey(today, 7))
  }

  const fromRow = (filters.page - 1) * filters.per
  const { data, count, error } = await query
    .order("updated_at", { ascending: false })
    .range(fromRow, fromRow + filters.per - 1)

  if (error) {
    console.error("[listCases]", error.message)
    throw new Error("Failed to load cases")
  }
  return { rows: (data ?? []) as CaseListItem[], total: count ?? 0 }
}

export async function getCase(id: string) {
  const supabase = await createClient()
  const { data } = await supabase.from("case_list").select("*").eq("id", id).maybeSingle()
  return data as CaseListItem | null
}

/** Everything shown on the case detail page, fetched in parallel. */
export const getCaseDetail = cache(async (id: string) => {
  const supabase = await createClient()
  const [caseRes, parties, events, tasks, documents, notes, activity, tags] = await Promise.all([
    supabase.from("case_list").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("case_parties")
      .select("id, case_id, person_id, role, person:people(id, full_name, contact_number, email, address)")
      .eq("case_id", id)
      .order("created_at"),
    supabase
      .from("events")
      .select("*, case:cases(id, case_number, title), participants:event_participants(person:people(id, full_name))")
      .eq("case_id", id)
      .order("starts_at", { ascending: false }),
    supabase
      .from("tasks")
      .select("*, assignee:profiles!tasks_assigned_to_fkey(id, full_name), case:cases(id, case_number, title)")
      .eq("case_id", id)
      .order("status")
      .order("due_date", { ascending: true, nullsFirst: false }),
    supabase
      .from("case_documents")
      .select("*, uploader:profiles(full_name)")
      .eq("case_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("case_notes")
      .select("id, body, created_at, created_by, author:profiles(full_name)")
      .eq("case_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("activity_logs")
      .select("*, user:profiles(full_name)")
      .eq("case_id", id)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("case_tags").select("tag:tags(id, name)").eq("case_id", id),
  ])

  if (!caseRes.data) return null

  return {
    case: caseRes.data as CaseListItem,
    parties: (parties.data ?? []) as unknown as CaseParty[],
    events: (events.data ?? []) as unknown as CalendarEvent[],
    tasks: (tasks.data ?? []) as unknown as Task[],
    documents: (documents.data ?? []) as unknown as CaseDocument[],
    notes: (notes.data ?? []) as unknown as Note[],
    activity: (activity.data ?? []) as unknown as ActivityLog[],
    tags: ((tags.data ?? []) as unknown as { tag: Tag }[]).map((t) => t.tag).filter(Boolean),
  }
})

export type CaseDetail = NonNullable<Awaited<ReturnType<typeof getCaseDetail>>>
