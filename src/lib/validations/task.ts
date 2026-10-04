import { z } from "zod"
import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/constants"
import { enumOf, optionalDate, optionalId, optionalText, requiredText } from "./helpers"

export const taskSchema = z.object({
  title: requiredText("Task title", 200),
  description: optionalText(5000),
  due_date: optionalDate,
  priority: enumOf(TASK_PRIORITIES),
  status: enumOf(TASK_STATUSES),
  assigned_to: optionalId,
  case_id: optionalId,
})

export type TaskInput = z.infer<typeof taskSchema>
