"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { requireSession } from "@/lib/auth"
import { canWrite } from "@/lib/permissions"
import { denied, fail, invalid, type ActionResult } from "@/lib/action-result"
import { eventSchema, type EventInput } from "@/lib/validations/event"
import { nullIfEmpty } from "@/lib/validations/helpers"
import { zonedToUtc } from "@/lib/datetime"

type Supabase = Awaited<ReturnType<typeof createClient>>

function eventRow(v: EventInput) {
  const startsAt = zonedToUtc(v.date, v.all_day ? "00:00" : v.start_time)
  const endsAt = !v.all_day && v.end_time ? zonedToUtc(v.date, v.end_time) : null
  return {
    title: v.title,
    event_type: v.event_type,
    subtype: nullIfEmpty(v.subtype),
    status: v.status,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt?.toISOString() ?? null,
    all_day: v.all_day,
    location: nullIfEmpty(v.location),
    case_id: nullIfEmpty(v.case_id),
    description: nullIfEmpty(v.description),
    reminder_minutes: v.reminder_minutes === "" ? null : Number(v.reminder_minutes),
  }
}

async function syncParticipants(supabase: Supabase, eventId: string, personIds: string[]) {
  const { error: delError } = await supabase.from("event_participants").delete().eq("event_id", eventId)
  if (delError) return delError
  const unique = [...new Set(personIds)]
  if (!unique.length) return null
  const { error } = await supabase
    .from("event_participants")
    .insert(unique.map((person_id) => ({ event_id: eventId, person_id })))
  return error
}

function revalidateEvents(caseId: string | null) {
  revalidatePath("/calendar")
  revalidatePath("/dashboard")
  if (caseId) revalidatePath(`/cases/${caseId}`)
}

export async function createEvent(values: EventInput): Promise<ActionResult<{ id: string; date: string }>> {
  const session = await requireSession()
  if (!canWrite(session.profile.role)) return denied()
  const parsed = eventSchema.safeParse(values)
  if (!parsed.success) return invalid(parsed.error)

  const supabase = await createClient()
  const row = eventRow(parsed.data)
  const { data, error } = await supabase
    .from("events")
    .insert({ ...row, created_by: session.userId })
    .select("id")
    .single()
  if (error) return fail(error, "createEvent")

  const pError = await syncParticipants(supabase, data.id, parsed.data.participant_ids)
  if (pError) console.error("[createEvent participants]", pError)

  revalidateEvents(row.case_id)
  return { ok: true, data: { id: data.id, date: parsed.data.date }, message: "Event created." }
}

export async function updateEvent(id: string, values: EventInput): Promise<ActionResult<{ id: string; date: string }>> {
  const session = await requireSession()
  if (!canWrite(session.profile.role)) return denied()
  const parsed = eventSchema.safeParse(values)
  if (!parsed.success) return invalid(parsed.error)

  const supabase = await createClient()
  const row = eventRow(parsed.data)
  const { data, error } = await supabase.from("events").update(row).eq("id", id).select("id")
  if (error) return fail(error, "updateEvent")
  if (!data?.length) return denied()

  const pError = await syncParticipants(supabase, id, parsed.data.participant_ids)
  if (pError) console.error("[updateEvent participants]", pError)

  revalidateEvents(row.case_id)
  return { ok: true, data: { id, date: parsed.data.date }, message: "Event updated." }
}

export async function deleteEvent(id: string): Promise<ActionResult> {
  await requireSession()
  const supabase = await createClient()
  const { data, error } = await supabase.from("events").delete().eq("id", id).select("id, case_id")
  if (error) return fail(error, "deleteEvent")
  if (!data?.length) return denied()
  revalidateEvents(data[0].case_id)
  return { ok: true, message: "Event deleted." }
}
