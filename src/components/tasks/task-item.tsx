"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { BriefcaseIcon, CalendarIcon, FlagIcon, MoreHorizontalIcon, PencilIcon, Trash2Icon, UserIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TaskPriorityBadge, TaskStatusBadge } from "@/components/shared/badges"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { TaskForm } from "@/components/tasks/task-form"
import { deleteTask, patchTask } from "@/lib/actions/tasks"
import { TASK_PRIORITIES } from "@/lib/constants"
import { diffDaysKey, formatDate, todayKey } from "@/lib/datetime"
import { canDeleteOwned, canEditOwned } from "@/lib/permissions"
import { cn } from "@/lib/utils"
import type { UserRole } from "@/lib/constants"
import type { CaseOption, ProfileOption, Task } from "@/lib/types"

function dueLabel(due: string | null, done: boolean) {
  if (!due) return null
  const diff = diffDaysKey(due, todayKey())
  if (done) return { text: formatDate(due), tone: "text-muted-foreground" }
  if (diff < 0) return { text: `Overdue · ${formatDate(due)}`, tone: "text-red-600 dark:text-red-400 font-medium" }
  if (diff === 0) return { text: "Due today", tone: "text-orange-600 dark:text-orange-400 font-medium" }
  if (diff === 1) return { text: "Due tomorrow", tone: "text-amber-700 dark:text-amber-400" }
  return { text: `Due ${formatDate(due)}`, tone: "text-muted-foreground" }
}

export function TaskItem({
  task,
  staff,
  cases,
  role,
  userId,
  showCase = true,
}: {
  task: Task
  staff: ProfileOption[]
  cases: CaseOption[]
  role: UserRole
  userId: string
  showCase?: boolean
}) {
  const router = useRouter()
  const [done, setDone] = React.useState(task.status === "completed")
  const [editing, setEditing] = React.useState(false)
  const [confirmDelete, setConfirmDelete] = React.useState(false)
  const editable = canEditOwned(role, userId, task.created_by, task.assigned_to)
  const deletable = canDeleteOwned(role, userId, task.created_by)

  // Follow the server value when it changes (e.g. after router.refresh()).
  const [prevStatus, setPrevStatus] = React.useState(task.status)
  if (prevStatus !== task.status) {
    setPrevStatus(task.status)
    setDone(task.status === "completed")
  }

  async function toggle(checked: boolean) {
    setDone(checked) // optimistic
    const res = await patchTask(task.id, { completed: checked })
    if (!res.ok) {
      setDone(!checked)
      toast.error(res.error)
      return
    }
    toast.success(checked ? "Task completed." : "Task reopened.")
    router.refresh()
  }

  async function setPriority(priority: string) {
    const res = await patchTask(task.id, { priority })
    if (!res.ok) toast.error(res.error)
    else router.refresh()
  }

  const due = dueLabel(task.due_date, done)

  return (
    <li className={cn("flex items-start gap-3 rounded-lg border bg-card p-3 transition-colors", done && "bg-muted/40")}>
      <Checkbox
        className="mt-0.5"
        checked={done}
        disabled={!editable}
        onCheckedChange={(v) => toggle(Boolean(v))}
        aria-label={done ? `Mark "${task.title}" as not done` : `Mark "${task.title}" as done`}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className={cn("text-sm font-medium", done && "text-muted-foreground line-through")}>{task.title}</p>
          <TaskPriorityBadge priority={task.priority} />
          {task.status === "in_progress" && !done && <TaskStatusBadge status="in_progress" />}
        </div>
        {task.description && (
          <p className={cn("mt-0.5 line-clamp-2 text-sm text-muted-foreground", done && "line-through")}>{task.description}</p>
        )}
        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {due && (
            <span className={cn("inline-flex items-center gap-1", due.tone)}>
              <CalendarIcon className="size-3" aria-hidden /> {due.text}
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <UserIcon className="size-3" aria-hidden /> {task.assignee?.full_name ?? "Unassigned"}
          </span>
          {showCase && task.case && (
            <Link href={`/cases/${task.case.id}?tab=tasks`} className="inline-flex items-center gap-1 text-primary hover:underline">
              <BriefcaseIcon className="size-3" aria-hidden /> {task.case.case_number}
            </Link>
          )}
        </div>
      </div>

      {(editable || deletable) && (
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for task ${task.title}`} />}>
            <MoreHorizontalIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {editable && (
              <>
                <DropdownMenuItem onClick={() => setEditing(true)}>
                  <PencilIcon /> Edit
                </DropdownMenuItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <FlagIcon /> Priority
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuRadioGroup value={task.priority} onValueChange={(v) => setPriority(String(v))}>
                      {TASK_PRIORITIES.map((p) => (
                        <DropdownMenuRadioItem key={p.value} value={p.value}>
                          {p.label}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </>
            )}
            {deletable && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => setConfirmDelete(true)}>
                  <Trash2Icon /> Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit task</DialogTitle>
          </DialogHeader>
          <TaskForm task={task} staff={staff} cases={cases} onDone={() => setEditing(false)} onCancel={() => setEditing(false)} />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete task?"
        onConfirm={async () => {
          const res = await deleteTask(task.id)
          if (!res.ok) {
            toast.error(res.error)
            return false
          }
          toast.success("Task deleted.")
          router.refresh()
        }}
      />
    </li>
  )
}
