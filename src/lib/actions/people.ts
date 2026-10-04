"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { requireSession } from "@/lib/auth"
import { canManage, canWrite } from "@/lib/permissions"
import { denied, fail, invalid, type ActionResult } from "@/lib/action-result"
import { personSchema, type PersonInput } from "@/lib/validations/person"
import { noteSchema } from "@/lib/validations/case"
import { nullIfEmpty } from "@/lib/validations/helpers"
import type { PersonOption } from "@/lib/types"

function personRow(v: PersonInput) {
  return {
    first_name: v.first_name,
    middle_name: nullIfEmpty(v.middle_name),
    last_name: v.last_name,
    suffix: nullIfEmpty(v.suffix),
    primary_role: v.primary_role,
    gender: nullIfEmpty(v.gender),
    date_of_birth: nullIfEmpty(v.date_of_birth),
    address: nullIfEmpty(v.address),
    contact_number: nullIfEmpty(v.contact_number),
    email: nullIfEmpty(v.email),
    occupation: nullIfEmpty(v.occupation),
    is_active: v.is_active,
  }
}

export async function createPerson(values: PersonInput): Promise<ActionResult<PersonOption>> {
  const session = await requireSession()
  if (!canWrite(session.profile.role)) return denied()
  const parsed = personSchema.safeParse(values)
  if (!parsed.success) return invalid(parsed.error)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("people")
    .insert({ ...personRow(parsed.data), created_by: session.userId })
    .select("id, full_name, primary_role")
    .single()
  if (error) return fail(error, "createPerson")

  revalidatePath("/people")
  return { ok: true, data: data as PersonOption, message: "Person added." }
}

export async function updatePerson(id: string, values: PersonInput): Promise<ActionResult<{ id: string }>> {
  const session = await requireSession()
  if (!canWrite(session.profile.role)) return denied()
  const parsed = personSchema.safeParse(values)
  if (!parsed.success) return invalid(parsed.error)

  const supabase = await createClient()
  const { data, error } = await supabase.from("people").update(personRow(parsed.data)).eq("id", id).select("id")
  if (error) return fail(error, "updatePerson")
  if (!data?.length) return denied()

  revalidatePath("/people")
  revalidatePath(`/people/${id}`)
  return { ok: true, data: { id }, message: "Person updated." }
}

export async function deletePerson(id: string): Promise<ActionResult> {
  const session = await requireSession()
  if (!canManage(session.profile.role)) return denied()

  const supabase = await createClient()
  const { count } = await supabase
    .from("case_parties")
    .select("id", { count: "exact", head: true })
    .eq("person_id", id)
  if (count) {
    return {
      ok: false,
      error: `This person is a party to ${count} case${count === 1 ? "" : "s"}. Remove them from those cases first, or mark them inactive.`,
    }
  }

  const { data, error } = await supabase.from("people").delete().eq("id", id).select("id")
  if (error) return fail(error, "deletePerson")
  if (!data?.length) return denied()
  revalidatePath("/people")
  return { ok: true, message: "Person deleted." }
}

export async function addPersonNote(personId: string, body: string): Promise<ActionResult> {
  const session = await requireSession()
  if (!canWrite(session.profile.role)) return denied()
  const parsed = noteSchema.safeParse({ body })
  if (!parsed.success) return invalid(parsed.error)

  const supabase = await createClient()
  const { error } = await supabase
    .from("person_notes")
    .insert({ person_id: personId, body: parsed.data.body, created_by: session.userId })
  if (error) return fail(error, "addPersonNote")
  revalidatePath(`/people/${personId}`)
  return { ok: true, message: "Note added." }
}

export async function deletePersonNote(noteId: string, personId: string): Promise<ActionResult> {
  await requireSession()
  const supabase = await createClient()
  const { data, error } = await supabase.from("person_notes").delete().eq("id", noteId).select("id")
  if (error) return fail(error, "deletePersonNote")
  if (!data?.length) return denied()
  revalidatePath(`/people/${personId}`)
  return { ok: true, message: "Note deleted." }
}
