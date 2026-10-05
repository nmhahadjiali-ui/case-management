import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { BriefcaseIcon, ChevronLeftIcon, GavelIcon } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CaseStatusBadge, EventStatusBadge, PartyRoleBadge, Pill } from "@/components/shared/badges"
import { EmptyState } from "@/components/shared/empty-state"
import { UserAvatar } from "@/components/shared/user-avatar"
import { PersonActions, PersonNotes } from "@/components/people/person-detail-client"
import { requireSession } from "@/lib/auth"
import { getPersonDetail } from "@/lib/data/people"
import { GENDERS, PARTY_ROLES, labelOf } from "@/lib/constants"
import { dateKey, diffDaysKey, formatDate, formatTime, todayKey } from "@/lib/datetime"
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
  const { person, cases, hearings, notes } = detail
  const role = session.profile.role
  const age = person.date_of_birth ? Math.floor(diffDaysKey(todayKey(), person.date_of_birth) / 365.25) : null
  const roleCounts = PARTY_ROLES.map((r) => ({ ...r, count: cases.filter((c) => c.role === r.value).length })).filter((r) => r.count)

  // Court appearances = hearings already held (completed); upcoming = still scheduled and in the future.
  const now = new Date().toISOString()
  const attended = hearings.filter((h) => h.status === "completed")
  const upcoming = hearings.filter((h) => h.status === "scheduled" && h.starts_at >= now)
  const hearingStats = [
    { label: "Court appearances", value: attended.length },
    { label: "Total hearings", value: hearings.length },
    { label: "Upcoming", value: upcoming.length },
    { label: "Postponed / cancelled", value: hearings.filter((h) => h.status === "postponed" || h.status === "cancelled").length },
  ]
  const hearingsByCase = (caseId: string) => hearings.filter((h) => h.case?.id === caseId)

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
            <CardContent className="grid gap-6">
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {hearingStats.map((s) => (
                  <div key={s.label} className="rounded-lg border p-3">
                    <dt className="text-xs text-muted-foreground">{s.label}</dt>
                    <dd className="text-2xl font-semibold tabular-nums">{s.value}</dd>
                  </div>
                ))}
              </dl>

              {cases.length === 0 ? (
                <EmptyState icon={BriefcaseIcon} title="No cases" description="This person has not been added to any case." />
              ) : (
                <ul className="divide-y">
                  {cases.map((h) => {
                    const caseHearings = hearingsByCase(h.case.id)
                    const caseAttended = caseHearings.filter((e) => e.status === "completed").length
                    return (
                      <li key={`${h.case.id}-${h.role}`}>
                        <Link href={`/cases/${h.case.id}`} className="flex flex-wrap items-center gap-3 rounded-md px-1 py-3 hover:bg-muted/50">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-muted-foreground">
                              {h.case.case_number} · {h.case.case_type?.name} · Filed {formatDate(h.case.date_filed)}
                            </p>
                            <p className="truncate text-sm font-medium">{h.case.title}</p>
                            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                              <GavelIcon className="size-3" aria-hidden />
                              {caseHearings.length
                                ? `${caseHearings.length} hearing${caseHearings.length === 1 ? "" : "s"} · ${caseAttended} attended`
                                : "No hearings yet"}
                            </p>
                          </div>
                          <PartyRoleBadge role={h.role} />
                          <CaseStatusBadge status={h.case.status} />
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}

              <div className="grid gap-2">
                <h3 className="text-sm font-semibold">Hearing History</h3>
                {hearings.length === 0 ? (
                  <EmptyState icon={GavelIcon} title="No hearings" description="No hearings recorded for this person's cases." className="py-6" />
                ) : (
                  <ul className="divide-y rounded-lg border">
                    {hearings.map((e) => (
                      <li key={e.id}>
                        <Link
                          href={`/calendar?view=day&date=${dateKey(e.starts_at)}&event=${e.id}`}
                          className="flex flex-wrap items-center gap-3 px-3 py-2.5 hover:bg-muted/50"
                        >
                          <div className="w-28 shrink-0 text-xs tabular-nums">
                            <p className="font-semibold">{formatDate(e.starts_at)}</p>
                            <p className="text-muted-foreground">{formatTime(e.starts_at)}</p>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{e.subtype || e.title}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {[e.case && `Case ${e.case.case_number}`, e.location].filter(Boolean).join(" · ")}
                            </p>
                          </div>
                          <EventStatusBadge status={e.status} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
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
