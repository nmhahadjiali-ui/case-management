"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { BellIcon, BriefcaseIcon, ClockIcon, MapPinIcon, PencilIcon, Trash2Icon, UsersIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { EventStatusBadge, EventTypeBadge } from "@/components/shared/badges"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { EventForm } from "@/components/calendar/event-form"
import { deleteEvent } from "@/lib/actions/events"
import { REMINDER_OPTIONS, labelOf } from "@/lib/constants"
import { formatDate, formatTime } from "@/lib/datetime"
import type { CalendarEvent, CaseOption, PersonOption } from "@/lib/types"

export function eventTimeLabel(e: CalendarEvent) {
  if (e.all_day) return "All day"
  return e.ends_at ? `${formatTime(e.starts_at)} – ${formatTime(e.ends_at)}` : formatTime(e.starts_at)
}

export function EventDetailDialog({
  event,
  onClose,
  canEdit,
  canDelete,
  cases,
  people,
}: {
  event: CalendarEvent | null
  onClose: () => void
  canEdit: boolean
  canDelete: boolean
  cases: CaseOption[]
  people: PersonOption[]
}) {
  const router = useRouter()
  // Editing state belongs to one event; opening another event starts in view mode.
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const editing = event !== null && editingId === event.id
  const setEditing = (on: boolean) => setEditingId(on && event ? event.id : null)
  const [confirm, setConfirm] = React.useState(false)

  return (
    <>
      <Dialog open={event !== null} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          {event && !editing && (
            <>
              <DialogHeader>
                <div className="flex flex-wrap gap-1.5">
                  <EventTypeBadge type={event.event_type} />
                  <EventStatusBadge status={event.status} />
                </div>
                <DialogTitle className="text-lg">{event.title}</DialogTitle>
                <DialogDescription>
                  {formatDate(event.starts_at, "long")}
                  {event.subtype ? ` · ${event.subtype}` : ""}
                </DialogDescription>
              </DialogHeader>
              <dl className="grid gap-3 text-sm">
                <div className="flex gap-3">
                  <dt><ClockIcon className="mt-0.5 size-4 text-muted-foreground" aria-label="Time" /></dt>
                  <dd>{eventTimeLabel(event)}</dd>
                </div>
                {event.location && (
                  <div className="flex gap-3">
                    <dt><MapPinIcon className="mt-0.5 size-4 text-muted-foreground" aria-label="Location" /></dt>
                    <dd>{event.location}</dd>
                  </div>
                )}
                {event.case && (
                  <div className="flex gap-3">
                    <dt><BriefcaseIcon className="mt-0.5 size-4 text-muted-foreground" aria-label="Case" /></dt>
                    <dd>
                      <Link href={`/cases/${event.case.id}`} className="text-primary hover:underline">
                        Case #{event.case.case_number}
                      </Link>{" "}
                      — {event.case.title}
                    </dd>
                  </div>
                )}
                {event.participants.length > 0 && (
                  <div className="flex gap-3">
                    <dt><UsersIcon className="mt-0.5 size-4 text-muted-foreground" aria-label="Participants" /></dt>
                    <dd className="flex flex-wrap gap-x-2">
                      {event.participants.map((p, i) => (
                        <Link key={p.person.id} href={`/people/${p.person.id}`} className="hover:underline">
                          {p.person.full_name}{i < event.participants.length - 1 ? "," : ""}
                        </Link>
                      ))}
                    </dd>
                  </div>
                )}
                {event.reminder_minutes !== null && (
                  <div className="flex gap-3">
                    <dt><BellIcon className="mt-0.5 size-4 text-muted-foreground" aria-label="Reminder" /></dt>
                    <dd>{labelOf(REMINDER_OPTIONS, String(event.reminder_minutes))}</dd>
                  </div>
                )}
              </dl>
              {event.description && <p className="rounded-lg bg-muted/50 p-3 text-sm whitespace-pre-wrap">{event.description}</p>}
              {(canEdit || canDelete) && (
                <div className="flex justify-end gap-2 border-t pt-4">
                  {canDelete && (
                    <Button variant="destructive" onClick={() => setConfirm(true)}>
                      <Trash2Icon aria-hidden /> Delete
                    </Button>
                  )}
                  {canEdit && (
                    <Button onClick={() => setEditing(true)}>
                      <PencilIcon aria-hidden /> Edit
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
          {event && editing && (
            <>
              <DialogHeader>
                <DialogTitle>Edit event</DialogTitle>
              </DialogHeader>
              <EventForm event={event} cases={cases} people={people} onCancel={() => setEditing(false)} onDone={onClose} />
            </>
          )}
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Delete event?"
        description={`"${event?.title}" will be removed from the calendar. This action cannot be undone.`}
        onConfirm={async () => {
          if (!event) return
          const res = await deleteEvent(event.id)
          if (!res.ok) {
            toast.error(res.error)
            return false
          }
          toast.success("Event deleted.")
          onClose()
          router.refresh()
        }}
      />
    </>
  )
}
