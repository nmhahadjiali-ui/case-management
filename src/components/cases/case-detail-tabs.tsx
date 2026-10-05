"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { CalendarPlusIcon, CalendarXIcon, ClockIcon, ListChecksIcon, MapPinIcon, PlusIcon } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { buttonVariants } from "@/components/ui/button"
import { EventStatusBadge, EventTypeBadge } from "@/components/shared/badges"
import { EmptyState } from "@/components/shared/empty-state"
import { ActivityList } from "@/components/shared/activity-list"
import { NotesPanel } from "@/components/shared/notes-panel"
import { DocumentsPanel } from "@/components/cases/documents-panel"
import { PartiesPanel } from "@/components/cases/parties-panel"
import { TaskItem } from "@/components/tasks/task-item"
import { addCaseNote, deleteCaseNote } from "@/lib/actions/cases"
import { dateKey, formatDate, formatTime } from "@/lib/datetime"
import { canDeleteOwned, canManage, canWrite } from "@/lib/permissions"
import type { CaseDetail } from "@/lib/data/cases"
import type { UserRole } from "@/lib/constants"
import type { CaseOption, PersonOption, ProfileOption } from "@/lib/types"

const TABS = ["overview", "parties", "hearings", "tasks", "documents", "notes", "activity"] as const
type Tab = (typeof TABS)[number]

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  )
}

export function CaseDetailTabs({
  detail,
  role,
  userId,
  canEdit,
  people,
  staff,
  cases,
}: {
  detail: CaseDetail
  role: UserRole
  userId: string
  canEdit: boolean
  people: PersonOption[]
  staff: ProfileOption[]
  cases: CaseOption[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const requested = searchParams.get("tab") as Tab | null
  const tab: Tab = requested && TABS.includes(requested) ? requested : "overview"
  const c = detail.case
  const writable = canWrite(role)

  function setTab(value: unknown) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === "overview") params.delete("tab")
    else params.set("tab", String(value))
    router.replace(`${pathname}${params.size ? `?${params}` : ""}`, { scroll: false })
  }

  const counts: Partial<Record<Tab, number>> = {
    parties: detail.parties.length,
    hearings: detail.events.length,
    tasks: detail.tasks.filter((t) => t.status !== "completed").length,
    documents: detail.documents.length,
    notes: detail.notes.length,
  }

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <TabsList variant="line" className="w-max">
          {TABS.map((t) => (
            <TabsTrigger key={t} value={t} className="capitalize">
              {t}
              {counts[t] ? <span className="rounded-full bg-muted px-1.5 text-[11px] text-muted-foreground tabular-nums">{counts[t]}</span> : null}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      <TabsContent value="overview" className="pt-4">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="grid content-start gap-2 lg:col-span-2">
            <h2 className="text-sm font-semibold">Description</h2>
            <p className="text-sm whitespace-pre-wrap text-muted-foreground">{c.description || "No description provided."}</p>
            {detail.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap items-start gap-1.5">
                {detail.tags.map((t) => (
                  <span key={t.id} className="rounded-full border bg-muted px-2 py-0.5 text-xs">#{t.name}</span>
                ))}
              </div>
            )}
          </div>
          <dl className="grid content-start gap-4 rounded-lg border bg-card p-4 sm:grid-cols-2 lg:grid-cols-1">
            <Detail label="Filing date">{formatDate(c.date_filed, "long")}</Detail>
            <Detail label="Next hearing">{c.next_hearing ? `${formatDate(c.next_hearing, "long")}, ${formatTime(c.next_hearing)}` : "None scheduled"}</Detail>
            <Detail label="Deadline">{c.deadline ? formatDate(c.deadline, "long") : "—"}</Detail>
            <Detail label="Resolution date">{c.resolution_date ? formatDate(c.resolution_date, "long") : "—"}</Detail>
            <Detail label="Assigned staff">{c.assigned_to_name ?? "Unassigned"}</Detail>
            <Detail label="Department / Office">{c.department_name ?? "—"}</Detail>
            <Detail label="Court / Location">{c.location_name ?? "—"}</Detail>
          </dl>
        </div>
      </TabsContent>

      <TabsContent value="parties" className="pt-4">
        <PartiesPanel caseId={c.id} parties={detail.parties} people={people} canEdit={canEdit} />
      </TabsContent>

      <TabsContent value="hearings" className="grid gap-4 pt-4">
        {writable && (
          <div className="flex justify-end">
            <Link href={`/calendar/new?case=${c.id}&type=hearing`} className={buttonVariants({ size: "sm" })}>
              <CalendarPlusIcon aria-hidden /> Schedule hearing / event
            </Link>
          </div>
        )}
        {detail.events.length === 0 ? (
          <EmptyState icon={CalendarXIcon} title="No hearings or events" description="Hearings, conferences and deadlines for this case will appear here." />
        ) : (
          <ul className="divide-y rounded-lg border bg-card">
            {detail.events.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/calendar?view=day&date=${dateKey(e.starts_at)}&event=${e.id}`}
                  className="flex flex-wrap items-center gap-3 p-3 hover:bg-muted/50"
                >
                  <div className="w-32 shrink-0">
                    <p className="text-sm font-medium">{formatDate(e.starts_at)}</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <ClockIcon className="size-3" aria-hidden /> {e.all_day ? "All day" : formatTime(e.starts_at)}
                    </p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{e.title}</p>
                    {e.location && (
                      <p className="flex items-center gap-1 truncate text-xs text-muted-foreground"><MapPinIcon className="size-3" aria-hidden /> {e.location}</p>
                    )}
                  </div>
                  <EventTypeBadge type={e.event_type} />
                  <EventStatusBadge status={e.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </TabsContent>

      <TabsContent value="tasks" className="grid gap-4 pt-4">
        {writable && (
          <div className="flex justify-end">
            <Link href={`/tasks/new?case=${c.id}`} className={buttonVariants({ size: "sm" })}>
              <PlusIcon aria-hidden /> New task
            </Link>
          </div>
        )}
        {detail.tasks.length === 0 ? (
          <EmptyState icon={ListChecksIcon} title="No tasks for this case" />
        ) : (
          <ul className="grid gap-2">
            {detail.tasks.map((t) => (
              <TaskItem key={t.id} task={t} staff={staff} cases={cases} role={role} userId={userId} showCase={false} />
            ))}
          </ul>
        )}
      </TabsContent>

      <TabsContent value="documents" className="pt-4">
        <DocumentsPanel
          caseId={c.id}
          documents={detail.documents}
          canUpload={writable}
          canDelete={(d) => canManage(role) || d.uploaded_by === userId}
        />
      </TabsContent>

      <TabsContent value="notes" className="pt-4">
        <NotesPanel
          notes={detail.notes}
          canAdd={writable}
          canDelete={(n) => canDeleteOwned(role, userId, n.created_by) || canManage(role)}
          onAdd={(body) => addCaseNote(c.id, body)}
          onDelete={(id) => deleteCaseNote(id, c.id)}
        />
      </TabsContent>

      <TabsContent value="activity" className="pt-4">
        <ActivityList items={detail.activity} />
      </TabsContent>
    </Tabs>
  )
}
