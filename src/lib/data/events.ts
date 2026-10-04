import "server-only"
import { createClient } from "@/lib/supabase/server"
import { addDaysKey, zonedToUtc } from "@/lib/datetime"
import { sanitizeSearch } from "@/lib/data/cases"
import type { CalendarEvent } from "@/lib/types"

const EVENT_SELECT =
  "*, case:cases(id, case_number, title), participants:event_participants(person:people(id, full_name))"

/** Events overlapping the date range [startKey, endKey] (inclusive, app time zone). */
export async function listEvents(opts: { startKey: string; endKey: string; type?: string; q?: string }) {
  const supabase = await createClient()
  const from = zonedToUtc(opts.startKey).toISOString()
  const to = zonedToUtc(addDaysKey(opts.endKey, 1)).toISOString()

  let query = supabase.from("events").select(EVENT_SELECT).gte("starts_at", from).lt("starts_at", to)
  if (opts.type) query = query.eq("event_type", opts.type)
  const q = sanitizeSearch(opts.q ?? "")
  if (q) query = query.or(`title.ilike.%${q}%,location.ilike.%${q}%,description.ilike.%${q}%`)

  const { data, error } = await query.order("starts_at").limit(1000)
  if (error) {
    console.error("[listEvents]", error.message)
    throw new Error("Failed to load events")
  }
  return (data ?? []) as unknown as CalendarEvent[]
}

export async function getEvent(id: string) {
  const supabase = await createClient()
  const { data } = await supabase.from("events").select(EVENT_SELECT).eq("id", id).maybeSingle()
  return data as unknown as CalendarEvent | null
}

export async function getUpcomingHearings(limit = 6) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("events")
    .select(EVENT_SELECT)
    .eq("event_type", "hearing")
    .in("status", ["scheduled", "postponed"])
    .gte("starts_at", new Date().toISOString())
    .order("starts_at")
    .limit(limit)
  return (data ?? []) as unknown as CalendarEvent[]
}
