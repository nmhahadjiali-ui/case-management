"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { requireSession } from "@/lib/auth"
import { fail, type ActionResult } from "@/lib/action-result"

export async function markNotificationRead(id: string, read = true): Promise<ActionResult> {
  await requireSession()
  const supabase = await createClient()
  const { error } = await supabase.from("notifications").update({ is_read: read }).eq("id", id)
  if (error) return fail(error, "markNotificationRead")
  revalidatePath("/notifications")
  return { ok: true }
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  const session = await requireSession()
  const supabase = await createClient()
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", session.userId)
    .eq("is_read", false)
  if (error) return fail(error, "markAllNotificationsRead")
  revalidatePath("/notifications")
  return { ok: true, message: "All notifications marked as read." }
}

export async function deleteNotification(id: string): Promise<ActionResult> {
  await requireSession()
  const supabase = await createClient()
  const { error } = await supabase.from("notifications").delete().eq("id", id)
  if (error) return fail(error, "deleteNotification")
  revalidatePath("/notifications")
  return { ok: true }
}
