import { z } from "zod"
import { EVENT_STATUSES, EVENT_TYPES } from "@/lib/constants"
import { enumOf, optionalId, optionalText, optionalTime, requiredDate, requiredText } from "./helpers"

export const eventSchema = z
  .object({
    title: requiredText("Event title", 200),
    event_type: enumOf(EVENT_TYPES),
    subtype: optionalText(80),
    status: enumOf(EVENT_STATUSES),
    date: requiredDate("Date"),
    all_day: z.boolean(),
    start_time: optionalTime,
    end_time: optionalTime,
    location: optionalText(200),
    case_id: optionalId,
    participant_ids: z.array(z.uuid()).max(50),
    description: optionalText(5000),
    reminder_minutes: z.string().refine((v) => v === "" || /^\d+$/.test(v), "Invalid reminder"),
  })
  .refine((v) => v.all_day || v.start_time !== "", {
    message: "Start time is required",
    path: ["start_time"],
  })
  .refine((v) => v.all_day || !v.end_time || v.end_time > v.start_time, {
    message: "End time must be after the start time",
    path: ["end_time"],
  })

export type EventInput = z.infer<typeof eventSchema>
