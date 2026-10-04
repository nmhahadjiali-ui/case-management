import "server-only"
import { createClient } from "@/lib/supabase/server"
import { PARTY_ROLES } from "@/lib/constants"
import { sanitizeSearch } from "@/lib/data/cases"
import type { Note, Person, PersonListItem } from "@/lib/types"
import type { CasePriority, CaseStatus, PartyRole } from "@/lib/constants"

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
    notes: (notes.data ?? []) as unknown as Note[],
  }
}

export async function getPerson(id: string) {
  const supabase = await createClient()
  const { data } = await supabase.from("people").select("*").eq("id", id).maybeSingle()
  return data as Person | null
}
