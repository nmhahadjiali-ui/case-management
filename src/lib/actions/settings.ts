"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { requireSession } from "@/lib/auth"
import { isAdmin } from "@/lib/permissions"
import { denied, fail, invalid, type ActionResult } from "@/lib/action-result"
import {
  calendarPrefsSchema,
  lookupSchema,
  notificationPrefsSchema,
  oathSchema,
  profileSchema,
  type CalendarPrefsInput,
  type LookupInput,
  type NotificationPrefsInput,
  type OathInput,
  type ProfileInput,
} from "@/lib/validations/settings"
import { nullIfEmpty } from "@/lib/validations/helpers"

export async function updateProfile(values: ProfileInput): Promise<ActionResult> {
  const session = await requireSession()
  const parsed = profileSchema.safeParse(values)
  if (!parsed.success) return invalid(parsed.error)

  const supabase = await createClient()
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.full_name, department_id: nullIfEmpty(parsed.data.department_id) })
    .eq("id", session.userId)
  if (error) return fail(error, "updateProfile")
  revalidatePath("/", "layout")
  return { ok: true, message: "Profile updated." }
}

/** Saves the public URL of an avatar the browser uploaded to the avatars bucket. */
export async function updateAvatar(url: string | null): Promise<ActionResult> {
  const session = await requireSession()
  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${session.userId}/`
  if (url !== null && !url.startsWith(base)) return { ok: false, error: "Invalid image." }

  const supabase = await createClient()
  const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", session.userId)
  if (error) return fail(error, "updateAvatar")
  revalidatePath("/", "layout")
  return { ok: true, message: url ? "Profile picture updated." : "Profile picture removed." }
}

export async function updateNotificationPrefs(values: NotificationPrefsInput): Promise<ActionResult> {
  const session = await requireSession()
  const parsed = notificationPrefsSchema.safeParse(values)
  if (!parsed.success) return invalid(parsed.error)
  const supabase = await createClient()
  const { error } = await supabase
    .from("user_settings")
    .upsert({ user_id: session.userId, ...parsed.data })
  if (error) return fail(error, "updateNotificationPrefs")
  revalidatePath("/settings/notifications")
  return { ok: true, message: "Notification preferences saved." }
}

export async function updateCalendarPrefs(values: CalendarPrefsInput): Promise<ActionResult> {
  const session = await requireSession()
  const parsed = calendarPrefsSchema.safeParse(values)
  if (!parsed.success) return invalid(parsed.error)
  const supabase = await createClient()
  const { error } = await supabase.from("user_settings").upsert({
    user_id: session.userId,
    default_calendar_view: parsed.data.default_calendar_view,
    working_hours_start: parsed.data.working_hours_start,
    working_hours_end: parsed.data.working_hours_end,
    default_reminder_minutes: Number(parsed.data.default_reminder_minutes),
  })
  if (error) return fail(error, "updateCalendarPrefs")
  revalidatePath("/settings/calendar")
  revalidatePath("/calendar")
  return { ok: true, message: "Calendar preferences saved." }
}

/** Remember the sidebar state in a cookie so the server renders it correctly. */
export async function setSidebarCollapsed(collapsed: boolean) {
  const store = await cookies()
  store.set("sidebar_collapsed", collapsed ? "1" : "0", {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  })
}

// ---- Lookup tables (administrators) ----

const LOOKUP_TABLES = {
  case_types: "case_types",
  departments: "departments",
  locations: "locations",
  tags: "tags",
} as const
export type LookupKind = keyof typeof LOOKUP_TABLES

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "type"
}

function lookupRow(kind: LookupKind, v: LookupInput): Record<string, string | null> {
  switch (kind) {
    case "case_types":
      return { name: v.name, slug: slugify(v.name), description: nullIfEmpty(v.extra) }
    case "locations":
      return { name: v.name, address: nullIfEmpty(v.extra) }
    default:
      return { name: v.name }
  }
}

export async function saveLookup(kind: LookupKind, id: string | null, values: LookupInput): Promise<ActionResult> {
  const session = await requireSession()
  if (!isAdmin(session.profile.role)) return denied()
  if (!(kind in LOOKUP_TABLES)) return { ok: false, error: "Unknown list." }
  const parsed = lookupSchema.safeParse(values)
  if (!parsed.success) return invalid(parsed.error)

  const supabase = await createClient()
  const row = lookupRow(kind, parsed.data)
  const { error } = id
    ? await supabase.from(LOOKUP_TABLES[kind]).update(row).eq("id", id)
    : await supabase.from(LOOKUP_TABLES[kind]).insert(row)
  if (error) return fail(error, "saveLookup")
  revalidatePath("/settings/cases")
  return { ok: true, message: id ? "Saved." : "Added." }
}

export async function deleteLookup(kind: LookupKind, id: string): Promise<ActionResult> {
  const session = await requireSession()
  if (!isAdmin(session.profile.role)) return denied()
  if (!(kind in LOOKUP_TABLES)) return { ok: false, error: "Unknown list." }

  const supabase = await createClient()
  const { error } = await supabase.from(LOOKUP_TABLES[kind]).delete().eq("id", id)
  if (error) {
    if (error.code === "23503") {
      return { ok: false, error: "This item is used by existing cases. Deactivate or rename it instead." }
    }
    return fail(error, "deleteLookup")
  }
  revalidatePath("/settings/cases")
  return { ok: true, message: "Deleted." }
}

export async function setCaseTypeActive(id: string, active: boolean): Promise<ActionResult> {
  const session = await requireSession()
  if (!isAdmin(session.profile.role)) return denied()
  const supabase = await createClient()
  const { error } = await supabase.from("case_types").update({ is_active: active }).eq("id", id)
  if (error) return fail(error, "setCaseTypeActive")
  revalidatePath("/settings/cases")
  return { ok: true }
}

export async function updateOath(values: OathInput): Promise<ActionResult> {
  const session = await requireSession()
  if (!isAdmin(session.profile.role)) return denied()
  const parsed = oathSchema.safeParse(values)
  if (!parsed.success) return invalid(parsed.error)
  const supabase = await createClient()
  const { error } = await supabase
    .from("app_settings")
    .upsert({ key: "oath", value: parsed.data, updated_by: session.userId, updated_at: new Date().toISOString() })
  if (error) return fail(error, "updateOath")
  revalidatePath("/oath")
  return { ok: true, message: "Oath updated." }
}
