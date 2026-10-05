import "server-only"
import { createClient } from "@/lib/supabase/server"
import { PARTY_ROLES } from "@/lib/constants"
import { sanitizeSearch } from "@/lib/data/cases"
import type { Note, Person, PersonListItem } from "@/lib/types"
import type { CasePriority, CaseStatus, EventStatus, PartyRole } from "@/lib/constants"

export type PeopleFilters = { q: string; role: string; status: string; type: string; page: number }

type RawParams = Record<string, string | string[] | undefined>
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ""

export function parsePeopleFilters(params: RawParams): PeopleFilters {
  const role = first(params.role)
  const status = first(params.status)
  return {
    q: first(params.q).trim().slice(0, 100),
    role: PARTY_ROLES.some((r) => r.value === role) ? role : "",
    status: ["active", "inactive"].includes(status) ? status : "",
    type: first(params.type),
    page: Math.max(1, Number(first(params.page)) || 1),
  }
}

export const PEOPLE_PAGE_SIZE = 24

export async function listPeople(filters: PeopleFilters) {
  const supabase = await createClient()
  let query = supabase.from("people_list").select("*", { count: "exact" })

  const q = sanitizeSearch(filters.q)
  if (q) {
    query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,contact_number.ilike.%${q}%,address.ilike.%${q}%`)
  }
  // A person matches a role if it is their primary role or their role in any case.
  if (filters.role) query = query.or(`primary_role.eq.${filters.role},case_roles.cs.{${filters.role}}`)
  if (filters.status) query = query.eq("is_active", filters.status === "active")
  if (filters.type) query = query.contains("case_types", [filters.type])

  const from = (filters.page - 1) * PEOPLE_PAGE_SIZE
  const { data, count, error } = await query
    .order("last_name")
    .order("first_name")
    .range(from, from + PEOPLE_PAGE_SIZE - 1)

  if (error) {
    console.error("[listPeople]", error.message)
    throw new Error("Failed to load people")
  }
  return { rows: (data ?? []) as PersonListItem[], total: count ?? 0 }
}

export type PersonCaseHistory = {
  role: PartyRole
  case: {
    id: string
    case_number: string
    title: string
    status: CaseStatus
    priority: CasePriority
    date_filed: string
    case_type: { name: string } | null
  }
}

export async function getPersonDetail(id: string) {
  const supabase = await createClient()
  const [person, history, notes] = await Promise.all([
    supabase.from("people").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("case_parties")
      .select("role, case:cases(id, case_number, title, status, priority, date_filed, case_type:case_types(name))")
      .eq("person_id", id),
    supabase
      .from("person_notes")
      .select("id, body, created_at, created_by, author:profiles(full_name)")
      .eq("person_id", id)
      .order("created_at", { ascending: false }),
  ])
  if (!person.data) return null
  const cases = ((history.data ?? []) as unknown as PersonCaseHistory[])
    .filter((h) => h.case)
    .sort((a, b) => b.case.date_filed.localeCompare(a.case.date_filed))
  return {
    person: person.data as Person,
    cases,
    hearings: await getPersonHearings(id, cases.map((h) => h.case.id)),
    notes: (notes.data ?? []) as unknown as Note[],
  }
}

export type PersonHearing = {
  id: string
  title: string
  subtype: string | null
  status: EventStatus
  starts_at: string
  location: string | null
  case: { id: string; case_number: string } | null
}

/** Hearings in any case the person is a party to, plus hearings they are listed on directly. Newest first. */
async function getPersonHearings(personId: string, caseIds: string[]) {
  const supabase = await createClient()
  const select = "id, title, subtype, status, starts_at, location, case:cases(id, case_number)"
  const [byCase, byParticipant] = await Promise.all([
    caseIds.length
      ? supabase.from("events").select(select).eq("event_type", "hearing").in("case_id", caseIds)
      : Promise.resolve({ data: [] }),
    supabase
      .from("events")
      .select(`${select}, event_participants!inner(person_id)`)
      .eq("event_type", "hearing")
      .eq("event_participants.person_id", personId),
  ])
  const all = new Map<string, PersonHearing>()
  for (const e of [...(byCase.data ?? []), ...(byParticipant.data ?? [])] as unknown as PersonHearing[]) {
    all.set(e.id, { id: e.id, title: e.title, subtype: e.subtype, status: e.status, starts_at: e.starts_at, location: e.location, case: e.case })
  }
  return [...all.values()].sort((a, b) => b.starts_at.localeCompare(a.starts_at))
}

export async function getPerson(id: string) {
  const supabase = await createClient()
  const { data } = await supabase.from("people").select("*").eq("id", id).maybeSingle()
  return data as Person | null
}
