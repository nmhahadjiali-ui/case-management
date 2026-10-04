import type { Metadata } from "next"
import Link from "next/link"
import { ListChecksIcon, PlusIcon } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/page-header"
import { SearchInput } from "@/components/shared/search-input"
import { EmptyState } from "@/components/shared/empty-state"
import { TaskFilters } from "@/components/tasks/task-filters"
import { TaskItem } from "@/components/tasks/task-item"
import { requireSession } from "@/lib/auth"
import { getTaskCounts, listTasks, parseTaskFilters } from "@/lib/data/tasks"
import { getCaseOptions, getLookups } from "@/lib/data/lookups"
import { canWrite } from "@/lib/permissions"

export const metadata: Metadata = { title: "Tasks" }

export default async function TasksPage({ searchParams }: PageProps<"/tasks">) {
  const session = await requireSession()
  const filters = parseTaskFilters(await searchParams)
  const [tasks, counts, lookups, cases] = await Promise.all([
    listTasks(filters, session.userId),
    getTaskCounts(session.userId),
    getLookups(),
    getCaseOptions(),
  ])
  const writable = canWrite(session.profile.role)
  const open = tasks.filter((t) => t.status !== "completed")
  const done = tasks.filter((t) => t.status === "completed")

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks"
        description="Track work items, due dates and assignments."
        actions={
          writable && (
            <Link href="/tasks/new" className={buttonVariants()}>
              <PlusIcon aria-hidden /> New Task
            </Link>
          )
        }
      />
      <SearchInput placeholder="Search tasks…" />
      <TaskFilters filters={filters} counts={counts} staff={lookups.staff} />

      {tasks.length === 0 ? (
        <EmptyState
          icon={ListChecksIcon}
          title="No tasks found."
          description="Try a different filter, or create a new task."
          action={writable && <Link href="/tasks/new" className={buttonVariants()}>New Task</Link>}
        />
      ) : (
        <div className="grid gap-6">
          {open.length > 0 && (
            <section aria-label="Open tasks">
              <ul className="grid gap-2">
                {open.map((t) => (
                  <TaskItem key={t.id} task={t} staff={lookups.staff} cases={cases} role={session.profile.role} userId={session.userId} />
                ))}
              </ul>
            </section>
          )}
          {done.length > 0 && (
            <section aria-labelledby="completed-heading" className="grid gap-2">
              <h2 id="completed-heading" className="text-sm font-semibold text-muted-foreground">
                Completed ({done.length})
              </h2>
              <ul className="grid gap-2">
                {done.map((t) => (
                  <TaskItem key={t.id} task={t} staff={lookups.staff} cases={cases} role={session.profile.role} userId={session.userId} />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
