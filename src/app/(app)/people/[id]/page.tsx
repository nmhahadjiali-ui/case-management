import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { BriefcaseIcon, ChevronLeftIcon } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CaseStatusBadge, PartyRoleBadge, Pill } from "@/components/shared/badges"
import { EmptyState } from "@/components/shared/empty-state"
import { UserAvatar } from "@/components/shared/user-avatar"
import { PersonActions, PersonNotes } from "@/components/people/person-detail-client"
import { requireSession } from "@/lib/auth"
import { getPersonDetail } from "@/lib/data/people"
import { GENDERS, PARTY_ROLES, labelOf } from "@/lib/constants"
import { diffDaysKey, formatDate, todayKey } from "@/lib/datetime"
import { canManage, canWrite } from "@/lib/permissions"

export const metadata: Metadata = { title: "Person" }

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm break-words">{value || "—"}</dd>
    </div>
  )
}

export default async function PersonDetailPage({ params }: PageProps<"/people/[id]">) {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const [session, detail] = await Promise.all([requireSession(), getPersonDetail(id)])
  if (!detail) notFound()
  const { person, cases, notes } = detail
  const role = session.profile.role
  const age = person.date_of_birth ? Math.floor(diffDaysKey(todayKey(), person.date_of_birth) / 365.25) : null
  const roleCounts = PARTY_ROLES.map((r) => ({ ...r, count: cases.filter((c) => c.role === r.value).length })).filter((r) => r.count)

  return (
    <div className="space-y-6">
      <Link href="/people" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeftIcon className="size-4" aria-hidden /> All people
      </Link>

      <Card>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <UserAvatar name={person.full_name} size="lg" className="size-14" />
            <div className="min-w-0 space-y-1">
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{person.full_name}</h1>
              <div className="flex flex-wrap gap-1.5">
                <PartyRoleBadge role={person.primary_role} />
                <Pill className={person.is_active ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-border bg-muted text-muted-foreground"}>
                  {person.is_active ? "Active" : "Inactive"}
                </Pill>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <PersonActions personId={person.id} name={person.full_name} canEdit={canWrite(role)} canDelete={canManage(role)} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <Field label="Full name" value={person.full_name} />
              <Field label="Date of birth" value={person.date_of_birth ? `${formatDate(person.date_of_birth, "long")}${age !== null ? ` (${age} years)` : ""}` : null} />
              <Field label="Gender" value={person.gender ? labelOf(GENDERS, person.gender) : null} />
              <Field label="Occupation" value={person.occupation} />
              <Field label="Address" value={person.address} />
              <Field label="Contact number" value={person.contact_number} />
              <Field label="Email" value={person.email ? <a href={`mailto:${person.email}`} className="text-primary hover:underline">{person.email}</a> : null} />
              <Field label="Record created" value={formatDate(person.created_at)} />
            </dl>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Case History</CardTitle>
              <CardDescription>
                {roleCounts.length
                  ? roleCounts.map((r) => `${r.label} in ${r.count} case${r.count === 1 ? "" : "s"}`).join(" · ")
                  : "Not involved in any case yet"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {cases.length === 0 ? (
                <EmptyState icon={BriefcaseIcon} title="No cases" description="This person has not been added to any case." />
              ) : (
                <ul className="divide-y">
                  {cases.map((h) => (
                    <li key={`${h.case.id}-${h.role}`}>
                      <Link href={`/cases/${h.case.id}`} className="flex flex-wrap items-center gap-3 rounded-md px-1 py-3 hover:bg-muted/50">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-muted-foreground">
                            {h.case.case_number} · {h.case.case_type?.name} · Filed {formatDate(h.case.date_filed)}
                          </p>
                          <p className="truncate text-sm font-medium">{h.case.title}</p>
                        </div>
                        <PartyRoleBadge role={h.role} />
                        <CaseStatusBadge status={h.case.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <PersonNotes personId={person.id} notes={notes} role={role} userId={session.userId} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
