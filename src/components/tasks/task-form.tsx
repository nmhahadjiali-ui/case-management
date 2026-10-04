"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2Icon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { FormField } from "@/components/shared/form-field"
import { NativeSelect } from "@/components/shared/native-select"
import { FormError } from "@/components/auth/login-form"
import { createTask, updateTask } from "@/lib/actions/tasks"
import { taskSchema, type TaskInput } from "@/lib/validations/task"
import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/constants"
import type { CaseOption, ProfileOption, Task } from "@/lib/types"

type TaskFormProps = {
  task?: Task | null
  staff: ProfileOption[]
  cases: CaseOption[]
  defaults?: Partial<TaskInput>
  /** Called after a successful save; otherwise navigates to `redirectTo`. */
  onDone?: () => void
  onCancel?: () => void
  redirectTo?: string
}

export function TaskForm({ task, staff, cases, defaults, onDone, onCancel, redirectTo = "/tasks" }: TaskFormProps) {
  const router = useRouter()
  const [error, setError] = React.useState<string | null>(null)
  const form = useForm<TaskInput>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task?.title ?? "",
      description: task?.description ?? "",
      due_date: task?.due_date ?? "",
      priority: task?.priority ?? "medium",
      status: task?.status ?? "pending",
      assigned_to: task?.assigned_to ?? "",
      case_id: task?.case_id ?? "",
      ...defaults,
    },
  })
  const { errors, isSubmitting } = form.formState

  async function onSubmit(values: TaskInput) {
    setError(null)
    const res = task ? await updateTask(task.id, values) : await createTask(values)
    if (!res.ok) {
      setError(res.error)
      return
    }
    toast.success(res.message)
    if (onDone) {
      onDone()
      router.refresh()
    } else {
      router.push(redirectTo)
      router.refresh()
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.stopPropagation()
        void form.handleSubmit(onSubmit)(e)
      }}
      className="grid gap-4"
      noValidate
    >
      <FormError message={error} />
      <FormField label="Task title" htmlFor="task_title" error={errors.title?.message} required>
        <Input autoFocus {...form.register("title")} />
      </FormField>
      <FormField label="Description" htmlFor="task_description" error={errors.description?.message}>
        <Textarea rows={3} {...form.register("description")} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="Due date" htmlFor="task_due" error={errors.due_date?.message}>
          <Input type="date" {...form.register("due_date")} />
        </FormField>
        <FormField label="Priority" htmlFor="task_priority" error={errors.priority?.message} required>
          <NativeSelect {...form.register("priority")}>
            {TASK_PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField label="Status" htmlFor="task_status" error={errors.status?.message} required>
          <NativeSelect {...form.register("status")}>
            {TASK_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </NativeSelect>
        </FormField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Assigned to" htmlFor="task_assignee" error={errors.assigned_to?.message}>
          <NativeSelect {...form.register("assigned_to")}>
            <option value="">Unassigned</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>{s.full_name}</option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField label="Related case" htmlFor="task_case" error={errors.case_id?.message}>
          <NativeSelect {...form.register("case_id")}>
            <option value="">None</option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>{c.case_number} — {c.title}</option>
            ))}
          </NativeSelect>
        </FormField>
      </div>
      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={() => (onCancel ? onCancel() : router.back())} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2Icon className="animate-spin" aria-hidden />}
          {task ? "Save changes" : "Create task"}
        </Button>
      </div>
    </form>
  )
}
