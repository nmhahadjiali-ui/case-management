import { z } from "zod"
import type { Option } from "@/lib/constants"

/** z.enum built from one of the option lists in lib/constants. */
export function enumOf<const T extends readonly Option[]>(options: T, message = "Please choose an option") {
  const values = options.map((o) => o.value) as unknown as [T[number]["value"], ...T[number]["value"][]]
  return z.enum(values, { message })
}

export const requiredText = (label: string, max = 200) =>
  z.string().trim().min(1, `${label} is required`).max(max, `${label} must be at most ${max} characters`)

export const optionalText = (max = 2000) =>
  z.string().trim().max(max, `Must be at most ${max} characters`)

/** Empty string or a YYYY-MM-DD date */
export const optionalDate = z
  .string()
  .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Enter a valid date")

export const requiredDate = (label: string) =>
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, `${label} is required`)

/** Empty string or HH:mm */
export const optionalTime = z.string().refine((v) => v === "" || /^\d{2}:\d{2}$/.test(v), "Enter a valid time")

/** Empty string or a UUID (optional foreign keys coming from a select) */
export const optionalId = z.string().refine((v) => v === "" || z.uuid().safeParse(v).success, "Invalid selection")

export const requiredId = (label: string) => z.uuid({ message: `${label} is required` })

/** Turn "" into null before writing to the database. */
export function nullIfEmpty(v: string | null | undefined): string | null {
  return v === "" || v === undefined || v === null ? null : v
}
