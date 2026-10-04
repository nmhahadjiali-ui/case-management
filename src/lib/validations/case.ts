import { z } from "zod"
import { CASE_PRIORITIES, CASE_STATUSES, PARTY_ROLES } from "@/lib/constants"
import {
  enumOf,
  optionalDate,
  optionalId,
  optionalText,
  optionalTime,
  requiredDate,
  requiredId,
  requiredText,
} from "./helpers"

export const casePartySchema = z.object({
  person_id: requiredId("Person"),
  role: enumOf(PARTY_ROLES),
})

export const caseSchema = z
  .object({
    case_number: requiredText("Case number", 50).regex(
      /^[A-Za-z0-9][A-Za-z0-9\-/. ]*$/,
      "Use letters, numbers, dashes, slashes or dots"
    ),
    title: requiredText("Case title", 200),
    case_type_id: requiredId("Case type"),
    description: optionalText(5000),
    date_filed: requiredDate("Filing date"),
    status: enumOf(CASE_STATUSES),
    priority: enumOf(CASE_PRIORITIES),
    assigned_to: optionalId,
    department_id: optionalId,
    location_id: optionalId,
    deadline: optionalDate,
    resolution_date: optionalDate,
    // Optional: schedules a hearing event when provided
    next_hearing_date: optionalDate,
    next_hearing_time: optionalTime,
    notes: optionalText(5000),
    tags: optionalText(300),
    parties: z.array(casePartySchema).max(50),
  })
  .refine((v) => v.parties.some((p) => p.role === "complainant"), {
    message: "Add at least one complainant",
    path: ["parties"],
  })
  .refine((v) => !v.resolution_date || v.resolution_date >= v.date_filed, {
    message: "Resolution date cannot be before the filing date",
    path: ["resolution_date"],
  })
  .refine((v) => !v.next_hearing_time || v.next_hearing_date, {
    message: "Choose a hearing date",
    path: ["next_hearing_date"],
  })
  .refine(
    (v) => {
      const keys = v.parties.map((p) => `${p.person_id}:${p.role}`)
      return new Set(keys).size === keys.length
    },
    { message: "The same person is listed twice with the same role", path: ["parties"] }
  )

export type CaseInput = z.infer<typeof caseSchema>

export const noteSchema = z.object({
  body: requiredText("Note", 5000),
})
export type NoteInput = z.infer<typeof noteSchema>
