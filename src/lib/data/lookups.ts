import "server-only"
import { cache } from "react"
import { createClient } from "@/lib/supabase/server"
import type { CaseOption, CaseType, Department, Location, Lookups, PersonOption, ProfileOption, Tag, UserSettings } from "@/lib/types"

/** Reference data used by forms and filters. Cached per request. */
export const getLookups = cache(async (): Promise<Lookups> => {
  const supabase = await createClient()
  const [types, departments, locations, staff] = await Promise.all([
    supabase.from("case_types").select("*").eq("is_active", true).order("sort_order").order("name"),
    supabase.from("departments").select("id, name").order("name"),
    supabase.from("locations").select("id, name, address").order("name"),
    supabase
      .from("profiles")
      .select("id, full_name, role")
      .eq("is_active", true)
      .neq("role", "viewer")
      .order("full_name"),
  ])
  return {
    caseTypes: (types.data ?? []) as CaseType[],
    departments: (departments.data ?? []) as Department[],
    locations: (locations.data ?? []) as Location[],
    staff: (staff.data ?? []) as ProfileOption[],
  }
})

export const getAllCaseTypes = cache(async () => {
  const supabase = await createClient()
  const { data } = await supabase.from("case_types").select("*").order("sort_order").order("name")
  return (data ?? []) as CaseType[]
})

export const getTags = cache(async () => {
  const supabase = await createClient()
  const { data } = await supabase.from("tags").select("id, name").order("name")
  return (data ?? []) as Tag[]
})

/** Lightweight list of people for pickers. */
export const getPersonOptions = cache(async (): Promise<PersonOption[]> => {
  const supabase = await createClient()
  const { data } = await supabase
    .from("people")
    .select("id, full_name, primary_role")
    .order("last_name")
    .limit(2000)
  return (data ?? []) as PersonOption[]
})

/** Open cases for "related case" pickers. */
export const getCaseOptions = cache(async (): Promise<CaseOption[]> => {
  const supabase = await createClient()
  const { data } = await supabase
    .from("cases")
    .select("id, case_number, title")
    .neq("status", "archived")
    .order("case_number", { ascending: false })
    .limit(2000)
  return (data ?? []) as CaseOption[]
})

/** The signed-in user's preferences (row is created at sign-up; defaults as fallback). */
export const getUserSettings = cache(async (userId: string): Promise<UserSettings> => {
  const supabase = await createClient()
  const { data } = await supabase.from("user_settings").select("*").eq("user_id", userId).maybeSingle()
  return (
    (data as UserSettings | null) ?? {
      user_id: userId,
      hearing_reminders: true,
      deadline_reminders: true,
      task_reminders: true,
      case_updates: true,
      email_notifications: false,
      in_app_notifications: true,
      default_calendar_view: "month",
      working_hours_start: "08:00:00",
      working_hours_end: "17:00:00",
      default_reminder_minutes: 60,
    }
  )
})
