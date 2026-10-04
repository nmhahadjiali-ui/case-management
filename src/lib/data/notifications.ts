import "server-only"
import { createClient } from "@/lib/supabase/server"
import { APP_TIMEZONE } from "@/lib/datetime"
import type { AppNotification } from "@/lib/types"

/**
 * Creates any due time-based reminders (idempotent), then returns the latest
 * notifications for the signed-in user.
 */
export async function getRecentNotifications(limit = 15) {
  const supabase = await createClient()
  await supabase.rpc("generate_my_reminders", { p_tz: APP_TIMEZONE })
  const [list, unread] = await Promise.all([
    supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(limit),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("is_read", false),
  ])
  return {
    items: (list.data ?? []) as AppNotification[],
    unread: unread.count ?? 0,
  }
}

export async function listNotifications(filter: "all" | "unread", page: number, pageSize = 25) {
  const supabase = await createClient()
  let query = supabase.from("notifications").select("*", { count: "exact" })
  if (filter === "unread") query = query.eq("is_read", false)
  const from = (page - 1) * pageSize
  const { data, count } = await query.order("created_at", { ascending: false }).range(from, from + pageSize - 1)
  return { items: (data ?? []) as AppNotification[], total: count ?? 0 }
}
