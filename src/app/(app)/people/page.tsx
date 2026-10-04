import type { Metadata } from "next"
import Link from "next/link"
import { UserPlusIcon, UsersIcon } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/page-header"
import { SearchInput } from "@/components/shared/search-input"
import { Pagination } from "@/components/shared/pagination"
import { EmptyState } from "@/components/shared/empty-state"
import { PersonCard } from "@/components/people/person-card"
import { PeopleFilters } from "@/components/people/people-filters"
import { requireSession } from "@/lib/auth"
import { listPeople, parsePeopleFilters, PEOPLE_PAGE_SIZE } from "@/lib/data/people"
import { getLookups } from "@/lib/data/lookups"
import { canWrite } from "@/lib/permissions"

export const metadata: Metadata = { title: "People" }

export default async function PeoplePage({ searchParams }: PageProps<"/people">) {
  const session = await requireSession()
  const filters = parsePeopleFilters(await searchParams)
  const [{ rows, total }, lookups] = await Promise.all([listPeople(filters), getLookups()])
  const writable = canWrite(session.profile.role)
  const hasFilters = Boolean(filters.q || filters.role || filters.status || filters.type)

  return (
    <div className="space-y-6">
      <PageHeader
        title="People"
        description="Complainants, defendants, witnesses and representatives involved in cases."
        actions={
          writable && (
            <Link href="/people/new" className={buttonVariants()}>
              <UserPlusIcon aria-hidden /> Add People
            </Link>
          )
        }
      />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SearchInput placeholder="Search name, email, phone or address…" className="sm:max-w-sm" />
        <PeopleFilters filters={filters} caseTypes={lookups.caseTypes} />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title="No people found."
          description={hasFilters ? "Try changing your search or filters, or add a new person." : "Add the people involved in your cases."}
          action={writable && <Link href="/people/new" className={buttonVariants()}>Add Person</Link>}
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {rows.map((p) => (
            <li key={p.id}>
              <PersonCard person={p} />
            </li>
          ))}
        </ul>
      )}
      <Pagination page={filters.page} perPage={PEOPLE_PAGE_SIZE} total={total} showPageSize={false} />
    </div>
  )
}
