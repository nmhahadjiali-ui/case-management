import type { Metadata } from "next"
import Link from "next/link"
import { PlusIcon } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PageHeader } from "@/components/shared/page-header"
import { SearchInput } from "@/components/shared/search-input"
import { Pagination } from "@/components/shared/pagination"
import { CaseFilters } from "@/components/cases/case-filters"
import { CaseTable } from "@/components/cases/case-table"
import { requireSession } from "@/lib/auth"
import { listCases, parseCaseFilters } from "@/lib/data/cases"
import { getLookups } from "@/lib/data/lookups"
import { canWrite } from "@/lib/permissions"

export const metadata: Metadata = { title: "Case Management" }

export default async function CasesPage({ searchParams }: PageProps<"/cases">) {
  const session = await requireSession()
  const filters = parseCaseFilters(await searchParams)
  const [{ rows, total }, lookups] = await Promise.all([listCases(filters), getLookups()])
  const hasFilters = Boolean(filters.q || filters.type || filters.status || filters.priority || filters.from || filters.to || filters.due)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Case Management"
        description="Manage and monitor all cases."
        actions={
          canWrite(session.profile.role) && (
            <Link href="/cases/new" className={buttonVariants()}>
              <PlusIcon aria-hidden /> New Case
            </Link>
          )
        }
      />
      <Card>
        <CardContent className="grid gap-4">
          <SearchInput placeholder="Search case number, title, complainant or defendant…" className="sm:max-w-md" />
          <CaseFilters filters={filters} caseTypes={lookups.caseTypes} />
        </CardContent>
      </Card>
      <CaseTable rows={rows} staff={lookups.staff} role={session.profile.role} userId={session.userId} hasFilters={hasFilters} />
      <Pagination page={filters.page} perPage={filters.per} total={total} />
    </div>
  )
}
