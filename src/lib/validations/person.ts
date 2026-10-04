import { z } from "zod"
import { GENDERS, PARTY_ROLES } from "@/lib/constants"
import { enumOf, optionalDate, optionalText, requiredText } from "./helpers"

export const personSchema = z.object({
  first_name: requiredText("First name", 80),
  middle_name: optionalText(80),
  last_name: requiredText("Last name", 80),
  suffix: optionalText(20),
  primary_role: enumOf(PARTY_ROLES),
  gender: z.union([z.literal(""), enumOf(GENDERS)]),
  date_of_birth: optionalDate.refine(
    (v) => !v || v <= new Date().toISOString().slice(0, 10),
    "Date of birth cannot be in the future"
  ),
  address: optionalText(300),
  contact_number: optionalText(30).refine(
    (v) => !v || /^[+()\d\s-]{7,30}$/.test(v),
    "Enter a valid phone number"
  ),
  email: z.union([z.literal(""), z.email("Enter a valid email address")]),
  occupation: optionalText(120),
  is_active: z.boolean(),
})

export type PersonInput = z.infer<typeof personSchema>
