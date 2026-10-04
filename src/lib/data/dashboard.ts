import "server-only"
import { createClient } from "@/lib/supabase/server"
import { addDaysKey, dateKey, todayKey } from "@/lib/datetime"
import { getUpcomingHearings } from "@/lib/data/events"
import type { ActivityLog, CaseListItem } from "@/lib/types"

export type DashboardStats = {
  total: number
  active: number
  pending: number
  closed: number
  new: number
  overdue: number
  due_week: number
  filed_this_month: number
  filed_last_month: number
  upcoming_hearings: number
  tasks_due_today: number
  tasks_overdue: number
  tasks_completed: number
  tasks_upcoming: number
}

export type AttentionReason = "overdue" | "hearing_soon" | "deadline" | "pending" | "updated"

export type AttentionItem = {
  case: CaseListItem
  reason: AttentionReason
  label: string
  date: string
}

/** Pick the most important reason a case needs attention (or null). */
function classify(c: CaseListItem, today: string, now: Date): AttentionItem | null {
  const weekAhead = addDaysKey(today, 7)
  if (c.deadline && c.deadline < today) {
    return { case: c, reason: "overdue", label: "Deadline passed", date: c.deadline }
  }
  if (c.next_hearing && dateKey(c.next_hearing) <= weekAhead) {
    return { case: c, reason: "hearing_soon", label: "Hearing within 7 days", date: c.next_hearing }
  }
  if (c.deadline && c.deadline <= weekAhead) {
    return { case: c, reason: "deadline", label: "Deadline approaching", date: c.deadline }
  }
  if (c.status === "pending" || c.status === "on_hold") {
    return { case: c, reason: "pending", label: c.status === "pending" ? "Pending action" : "On hold", date: c.updated_at }
  }
  if (now.getTime() - new Date(c.updated_at).getTime() < 48 * 3600 * 1000) {
    return { case: c, reason: "updated", label: "Recently updated", date: c.updated_at }
  }
  return null
}

const REASON_ORDER: AttentionReason[] = ["overdue", "hearing_soon", "deadline", "pending", "updated"]

export async function getDashboardData() {
  const supabase = await createClient()
  const today = todayKey()
  const now = new Date()
  const weekAhead = addDaysKey(today, 7)
  const twoDaysAgo = new Date(now.getTime() - 48 * 3600 * 1000).toISOString()
  const weekAheadInstant = new Date(now.getTime() + 7 * 86400 * 1000).toISOString()

  const [stats, byType, attention, hearings, recentCases, activity] = await Promise.all([
    supabase.rpc("get_dashboard_stats", { p_today: today }),
    supabase.rpc("get_cases_by_type"),
    supabase
      .from("case_list")
      .select("*")
      .not("status", "in", "(closed,archived)")
      .or(
        `deadline.lte.${weekAhead},next_hearing.lte.${weekAheadInstant},status.in.(pending,on_hold),updated_at.gte.${twoDaysAgo}`
      )
      .order("updated_at", { ascending: false })
      .limit(50),
    getUpcomingHearings(6),
    supabase.from("case_list").select("*").order("updated_at", { ascending: false }).limit(6),
    supabase
      .from("activity_logs")
      .select("*, user:profiles(full_name)")
      .neq("entity_type", "user")
      .order("created_at", { ascending: false })
      .limit(8),
  ])

  if (stats.error) console.error("[dashboard stats]", stats.error.message)

  const attentionItems = ((attention.data ?? []) as CaseListItem[])
    .map((c) => classify(c, today, now))
    .filter((x): x is AttentionItem => x !== null)
    .sort((a, b) => REASON_ORDER.indexOf(a.reason) - REASON_ORDER.indexOf(b.reason))
    .slice(0, 8)

  return {
    stats: (stats.data ?? null) as DashboardStats | null,
    byType: (byType.data ?? []) as { name: string; slug: string; total: number }[],
    attention: attentionItems,
    hearings,
    recentCases: (recentCases.data ?? []) as CaseListItem[],
    activity: (activity.data ?? []) as unknown as ActivityLog[],
  }
}
