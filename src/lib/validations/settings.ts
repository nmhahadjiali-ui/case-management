import { z } from "zod"
import { USER_ROLES } from "@/lib/constants"
import { passwordSchema } from "./auth"
import { enumOf, optionalId, optionalText, requiredText } from "./helpers"

export const profileSchema = z.object({
  full_name: requiredText("Full name", 120),
  department_id: optionalId,
})
export type ProfileInput = z.infer<typeof profileSchema>

export const notificationPrefsSchema = z.object({
  hearing_reminders: z.boolean(),
  deadline_reminders: z.boolean(),
  task_reminders: z.boolean(),
  case_updates: z.boolean(),
  email_notifications: z.boolean(),
  in_app_notifications: z.boolean(),
})
export type NotificationPrefsInput = z.infer<typeof notificationPrefsSchema>

export const calendarPrefsSchema = z
  .object({
    default_calendar_view: z.enum(["month", "week", "day"]),
    working_hours_start: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time"),
    working_hours_end: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time"),
    default_reminder_minutes: z.string().regex(/^\d+$/, "Invalid reminder"),
  })
  .refine((v) => v.working_hours_end > v.working_hours_start, {
    message: "End must be after start",
    path: ["working_hours_end"],
  })
export type CalendarPrefsInput = z.infer<typeof calendarPrefsSchema>

export const lookupSchema = z.object({
  name: requiredText("Name", 120),
  extra: optionalText(300), // address for locations, description for case types
})
export type LookupInput = z.infer<typeof lookupSchema>

export const newUserSchema = z.object({
  full_name: requiredText("Full name", 120),
  email: z.email("Enter a valid email address"),
  role: enumOf(USER_ROLES),
  password: passwordSchema,
})
export type NewUserInput = z.infer<typeof newUserSchema>

export const updateUserSchema = z.object({
  role: enumOf(USER_ROLES),
  department_id: optionalId,
})
export type UpdateUserInput = z.infer<typeof updateUserSchema>

export const oathSchema = z.object({
  title: requiredText("Title", 120),
  body: requiredText("Text", 10000),
})
export type OathInput = z.infer<typeof oathSchema>
