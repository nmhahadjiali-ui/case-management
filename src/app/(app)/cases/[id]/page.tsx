import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeftIcon, UserIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { CasePriorityBadge, CaseStatusBadge } from "@/components/shared/badges"
import { CaseDetailTabs } from "@/components/cases/case-detail-tabs"
import { CaseHeaderActions } from "@/components/cases/case-header-actions"
import { requireSession } from "@/lib/auth"
import { getCaseDetail } from "@/lib/data/cases"
import { getCaseOptions, getLookups, getPersonOptions } from "@/lib/data/lookups"
import { canEditCase, canManage } from "@/lib/permissions"

const UUID = /^[0-9a-f-]{36}$/i

export async function generateMetadata({ params }: PageProps<"/cases/[id]">): Promise<Metadata> {
  const { id } = await params
  if (!UUID.test(id)) return { title: "Case" }
  const detail = await getCaseDetail(id)
  return { title: detail ? `Case ${detail.case.case_number}` : "Case" }
}

export default async function CaseDetailPage({ params }: PageProps<"/cases/[id]">) {
  const { id } = await params
  if (!UUID.test(id)) notFound()
  const [session, detail, people, lookups, cases] = await Promise.all([
    requireSession(),
    getCaseDetail(id),
    getPersonOptions(),
    getLookups(),
    getCaseOptions(),
  ])
  if (!detail) notFound()

  const c = detail.case
  const role = session.profile.role
  const editable = canEditCase(role, session.userId, c)

  return (
    <div className="space-y-6">
      <Link href="/cases" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeftIcon className="size-4" aria-hidden /> All cases
      </Link>

      <Card>
        <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-2">
            <p className="text-sm font-semibold text-primary">Case {c.case_number}</p>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{c.title}</h1>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-md border px-2 py-0.5 text-xs font-medium">{c.case_type_name}</span>
              <CaseStatusBadge status={c.status} />
              <CasePriorityBadge priority={c.priority} />
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <UserIcon className="size-3.5" aria-hidden /> {c.assigned_to_name ?? "Unassigned"}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <CaseHeaderActions
              caseId={c.id}
              caseNumber={c.case_number}
              canEdit={editable}
              canDelete={canManage(role)}
              archived={c.status === "archived"}
            />
          </div>
        </CardContent>
      </Card>

      <CaseDetailTabs
        detail={detail}
        role={role}
        userId={session.userId}
        canEdit={editable}
        people={people}
        staff={lookups.staff}
        cases={cases}
      />
    </div>
  )
}
