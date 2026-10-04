"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { requireSession } from "@/lib/auth"
import { canManage, canWrite } from "@/lib/permissions"
import { denied, fail, invalid, type ActionResult } from "@/lib/action-result"
import { caseSchema, noteSchema, type CaseInput } from "@/lib/validations/case"
import { nullIfEmpty } from "@/lib/validations/helpers"
import { zonedToUtc } from "@/lib/datetime"
import { CASE_STATUSES, PARTY_ROLES } from "@/lib/constants"

type Supabase = Awaited<ReturnType<typeof createClient>>

const idList = z.array(z.uuid()).min(1).max(500)

function caseRow(v: CaseInput) {
  return {
    case_number: v.case_number,
    title: v.title,
    case_type_id: v.case_type_id,
    description: nullIfEmpty(v.description),
    date_filed: v.date_filed,
    status: v.status,
    priority: v.priority,
    assigned_to: nullIfEmpty(v.assigned_to),
    department_id: nullIfEmpty(v.department_id),
    location_id: nullIfEmpty(v.location_id),
    deadline: nullIfEmpty(v.deadline),
    resolution_date: nullIfEmpty(v.resolution_date),
  }
}

/** Replace the case's tags with the comma-separated list in `tags`. */
async function syncTags(supabase: Supabase, caseId: string, tags: string) {
  const names = [...new Set(tags.split(",").map((t) => t.trim()).filter(Boolean))].slice(0, 20)
  await supabase.from("case_tags").delete().eq("case_id", caseId)
  if (names.length === 0) return null

  const { data: existing } = await supabase.from("tags").select("id, name").in("name", names)
  const known = new Map((existing ?? []).map((t) => [t.name as string, t.id as string]))
  const missing = names.filter((n) => !known.has(n))
  if (missing.length) {
    const { data: created, error } = await supabase
      .from("tags")
      .insert(missing.map((name) => ({ name: name.slice(0, 40) })))
      .select("id, name")
    if (error) return error
    for (const t of created ?? []) known.set(t.name, t.id)
  }
  const { error } = await supabase
    .from("case_tags")
    .insert([...known.values()].map((tag_id) => ({ case_id: caseId, tag_id })))
  return error
}

/** Make the case's parties match `parties` (insert new, delete removed). */
async function syncParties(supabase: Supabase, caseId: string, parties: CaseInput["parties"]) {
  const { data: current } = await supabase.from("case_parties").select("id, person_id, role").eq("case_id", caseId)
  const key = (p: { person_id: string; role: string }) => `${p.person_id}:${p.role}`
  const wanted = new Set(parties.map(key))
  const have = new Set((current ?? []).map(key))

  const toDelete = (current ?? []).filter((p) => !wanted.has(key(p))).map((p) => p.id)
  const toInsert = parties.filter((p) => !have.has(key(p))).map((p) => ({ ...p, case_id: caseId }))

  if (toDelete.length) {
    const { error } = await supabase.from("case_parties").delete().in("id", toDelete)
    if (error) return error
  }
  if (toInsert.length) {
    const { error } = await supabase.from("case_parties").insert(toInsert)
    if (error) return error
  }
  return null
}

async function scheduleHearing(supabase: Supabase, caseId: string, v: CaseInput, userId: string, location: string | null) {
  if (!v.next_hearing_date) return null
  const startsAt = zonedToUtc(v.next_hearing_date, v.next_hearing_time || "09:00")
  const { error } = await supabase.from("events").insert({
    title: `Hearing — ${v.case_number}`,
    event_type: "hearing",
    starts_at: startsAt.toISOString(),
    ends_at: new Date(startsAt.getTime() + 60 * 60 * 1000).toISOString(),
    case_id: caseId,
    location,
    created_by: userId,
  })
  return error
}

async function locationName(supabase: Supabase, id: string | null) {
  if (!id) return null
  const { data } = await supabase.from("locations").select("name").eq("id", id).maybeSingle()
  return (data?.name as string | undefined) ?? null
}

function revalidateCases(id?: string) {
  revalidatePath("/cases")
  revalidatePath("/dashboard")
  if (id) revalidatePath(`/cases/${id}`)
}

export async function createCase(values: CaseInput): Promise<ActionResult<{ id: string }>> {
  const session = await requireSession()
  if (!canWrite(session.profile.role)) return denied()
  const parsed = caseSchema.safeParse(values)
  if (!parsed.success) return invalid(parsed.error)
  const v = parsed.data

  const supabase = await createClient()
  const { data: created, error } = await supabase
    .from("cases")
    .insert({ ...caseRow(v), created_by: session.userId })
    .select("id")
    .single()
  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "This case number is already in use.", fieldErrors: { case_number: ["Case number already exists"] } }
    }
    return fail(error, "createCase")
  }

  const id = created.id as string
  const partyError = await syncParties(supabase, id, v.parties)
  if (partyError) {
    // Roll back so we never leave a case without its parties.
    await supabase.from("cases").delete().eq("id", id)
    return fail(partyError, "createCase.parties")
  }

  const followUps = await Promise.all([
    syncTags(supabase, id, v.tags),
    scheduleHearing(supabase, id, v, session.userId, await locationName(supabase, nullIfEmpty(v.location_id))),
    v.notes
      ? supabase.from("case_notes").insert({ case_id: id, body: v.notes, created_by: session.userId }).then((r) => r.error)
      : null,
  ])
  followUps.filter(Boolean).forEach((e) => console.error("[createCase follow-up]", e))

  revalidateCases(id)
  return { ok: true, data: { id }, message: "Case created." }
}

export async function updateCase(id: string, values: CaseInput): Promise<ActionResult<{ id: string }>> {
  const session = await requireSession()
  if (!canWrite(session.profile.role)) return denied()
  const parsed = caseSchema.safeParse(values)
  if (!parsed.success) return invalid(parsed.error)
  const v = parsed.data

  const supabase = await createClient()
  const { data: updated, error } = await supabase.from("cases").update(caseRow(v)).eq("id", id).select("id")
  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "This case number is already in use.", fieldErrors: { case_number: ["Case number already exists"] } }
    }
    return fail(error, "updateCase")
  }
  if (!updated?.length) return denied()

  const partyError = await syncParties(supabase, id, v.parties)
  if (partyError) return fail(partyError, "updateCase.parties")
  const tagError = await syncTags(supabase, id, v.tags)
  if (tagError) console.error("[updateCase tags]", tagError)
  const hearingError = await scheduleHearing(
    supabase, id, v, session.userId, await locationName(supabase, nullIfEmpty(v.location_id))
  )
  if (hearingError) console.error("[updateCase hearing]", hearingError)

  revalidateCases(id)
  return { ok: true, data: { id }, message: "Case updated." }
}

export async function deleteCases(ids: string[]): Promise<ActionResult> {
  const session = await requireSession()
  if (!canManage(session.profile.role)) return denied()
  const parsed = idList.safeParse(ids)
  if (!parsed.success) return { ok: false, error: "Nothing selected." }

  const supabase = await createClient()
  // Remove stored files first; metadata rows cascade with the case.
  const { data: docs } = await supabase.from("case_documents").select("file_path").in("case_id", parsed.data)
  const paths = (docs ?? []).map((d) => d.file_path as string)
  if (paths.length) await supabase.storage.from("case-documents").remove(paths)

  const { data, error } = await supabase.from("cases").delete().in("id", parsed.data).select("id")
  if (error) return fail(error, "deleteCases")
  revalidateCases()
  const n = data?.length ?? 0
  return { ok: true, message: `${n} case${n === 1 ? "" : "s"} deleted.` }
}

export async function updateCasesBulk(
  ids: string[],
  patch: { status?: string; assigned_to?: string | null }
): Promise<ActionResult> {
  const session = await requireSession()
  if (!canWrite(session.profile.role)) return denied()
  const parsed = idList.safeParse(ids)
  if (!parsed.success) return { ok: false, error: "Nothing selected." }

  const update: Record<string, string | null> = {}
  if (patch.status !== undefined) {
    if (!CASE_STATUSES.some((s) => s.value === patch.status)) return { ok: false, error: "Invalid status." }
    update.status = patch.status
  }
  if (patch.assigned_to !== undefined) {
    if (patch.assigned_to !== null && !z.uuid().safeParse(patch.assigned_to).success) {
      return { ok: false, error: "Invalid staff member." }
    }
    update.assigned_to = patch.assigned_to
  }
  if (Object.keys(update).length === 0) return { ok: false, error: "Nothing to update." }

  const supabase = await createClient()
  const { data, error } = await supabase.from("cases").update(update).in("id", parsed.data).select("id")
  if (error) return fail(error, "updateCasesBulk")
  revalidateCases()
  const n = data?.length ?? 0
  if (n < parsed.data.length) {
    return { ok: true, message: `${n} of ${parsed.data.length} cases updated (you may not have access to the rest).` }
  }
  return { ok: true, message: `${n} case${n === 1 ? "" : "s"} updated.` }
}

export async function archiveCases(ids: string[]) {
  return updateCasesBulk(ids, { status: "archived" })
}

// ---- Notes ----

export async function addCaseNote(caseId: string, body: string): Promise<ActionResult> {
  const session = await requireSession()
  if (!canWrite(session.profile.role)) return denied()
  const parsed = noteSchema.safeParse({ body })
  if (!parsed.success) return invalid(parsed.error)

  const supabase = await createClient()
  const { error } = await supabase
    .from("case_notes")
    .insert({ case_id: caseId, body: parsed.data.body, created_by: session.userId })
  if (error) return fail(error, "addCaseNote")
  revalidatePath(`/cases/${caseId}`)
  return { ok: true, message: "Note added." }
}

export async function deleteCaseNote(noteId: string, caseId: string): Promise<ActionResult> {
  await requireSession()
  const supabase = await createClient()
  const { data, error } = await supabase.from("case_notes").delete().eq("id", noteId).select("id")
  if (error) return fail(error, "deleteCaseNote")
  if (!data?.length) return denied()
  revalidatePath(`/cases/${caseId}`)
  return { ok: true, message: "Note deleted." }
}

// ---- Parties (from the case detail page) ----

export async function addCaseParty(caseId: string, personId: string, role: string): Promise<ActionResult> {
  const session = await requireSession()
  if (!canWrite(session.profile.role)) return denied()
  if (!PARTY_ROLES.some((r) => r.value === role) || !z.uuid().safeParse(personId).success) {
    return { ok: false, error: "Choose a person and a role." }
  }
  const supabase = await createClient()
  const { error } = await supabase.from("case_parties").insert({ case_id: caseId, person_id: personId, role })
  if (error) {
    if (error.code === "23505") return { ok: false, error: "This person already has that role in the case." }
    return fail(error, "addCaseParty")
  }
  revalidateCases(caseId)
  return { ok: true, message: "Party added." }
}

export async function removeCaseParty(partyId: string, caseId: string): Promise<ActionResult> {
  await requireSession()
  const supabase = await createClient()
  const { data, error } = await supabase.from("case_parties").delete().eq("id", partyId).select("id")
  if (error) return fail(error, "removeCaseParty")
  if (!data?.length) return denied()
  revalidateCases(caseId)
  return { ok: true, message: "Party removed." }
}
