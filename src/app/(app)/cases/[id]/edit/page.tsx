import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { PageHeader } from "@/components/shared/page-header"
import { CaseForm } from "@/components/cases/case-form"
import { requireSession } from "@/lib/auth"
import { getCaseDetail } from "@/lib/data/cases"
import { getLookups, getPersonOptions } from "@/lib/data/lookups"
import { canEditCase } from "@/lib/permissions"

export const metadata: Metadata = { title: "Edit Case" }

export default async function EditCasePage({ params }: PageProps<"/cases/[id]/edit">) {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const [session, detail, lookups, people] = await Promise.all([requireSession(), getCaseDetail(id), getLookups(), getPersonOptions()])
  if (!detail) notFound()
  if (!canEditCase(session.profile.role, session.userId, detail.case)) redirect(`/cases/${id}`)

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader title={`Edit Case ${detail.case.case_number}`} description={detail.case.title} />
      <Card>
        <CardContent>
          <CaseForm
            lookups={lookups}
            people={people}
            existing={{
              case: detail.case,
              parties: detail.parties.map((p) => ({ person_id: p.person_id, role: p.role })),
              tags: detail.tags.map((t) => t.name),
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
