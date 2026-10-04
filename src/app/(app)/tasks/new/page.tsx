import type { Metadata } from "next"
import { Card, CardContent } from "@/components/ui/card"
import { PageHeader } from "@/components/shared/page-header"
import { TaskForm } from "@/components/tasks/task-form"
import { requireRole } from "@/lib/auth"
import { getCaseOptions, getLookups } from "@/lib/data/lookups"

export const metadata: Metadata = { title: "New Task" }

export default async function NewTaskPage({ searchParams }: PageProps<"/tasks/new">) {
  await requireRole("administrator", "case_manager", "staff")
  const params = await searchParams
  const [lookups, cases] = await Promise.all([getLookups(), getCaseOptions()])
  const caseId = typeof params.case === "string" && cases.some((c) => c.id === params.case) ? params.case : ""

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="New Task" description="Create a task and assign it to a staff member." />
      <Card>
        <CardContent>
          <TaskForm
            staff={lookups.staff}
            cases={cases}
            defaults={{ case_id: caseId }}
            redirectTo={caseId ? `/cases/${caseId}?tab=tasks` : "/tasks"}
          />
        </CardContent>
      </Card>
    </div>
  )
}
