"use client"

import * as React from "react"
import Link from "next/link"
import { CalendarPlusIcon, CalendarXIcon, ChevronLeftIcon, ChevronRightIcon, Loader2Icon } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { EmptyState } from "@/components/shared/empty-state"
import { EventDetailDialog, eventTimeLabel } from "@/components/calendar/event-detail"
import { useQueryParams } from "@/hooks/use-query-params"
import { EVENT_TYPES, EVENT_TYPE_STYLE, labelOf } from "@/lib/constants"
import {
  addDaysKey,
  addMonthsKey,
  dateKey,
  formatDate,
  formatMonthYear,
  formatTime,
  formatWeekday,
  startOfMonthKey,
  startOfWeekKey,
  timeKey,
} from "@/lib/datetime"
import { canDeleteOwned, canEditOwned } from "@/lib/permissions"
import { cn } from "@/lib/utils"
import type { UserRole } from "@/lib/constants"
import type { CalendarEvent, CaseOption, PersonOption } from "@/lib/types"

export type CalendarViewMode = "month" | "week" | "day"

type Props = {
  events: CalendarEvent[]
  view: CalendarViewMode
  date: string
  today: string
  role: UserRole
  userId: string
  cases: CaseOption[]
  people: PersonOption[]
  workingHours: { start: number; end: number }
  openEventId?: string
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function EventChip({ event, onOpen, showTime = true }: { event: CalendarEvent; onOpen: (e: CalendarEvent) => void; showTime?: boolean }) {
  const style = EVENT_TYPE_STYLE[event.event_type]
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onOpen(event)
      }}
      className={cn(
        "flex w-full min-w-0 items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-left text-xs outline-none hover:brightness-95 focus-visible:ring-2 focus-visible:ring-ring",
        style.chip,
        event.status === "cancelled" && "line-through opacity-60"
      )}
      title={`${event.title} · ${eventTimeLabel(event)}`}
    >
      <span className={cn("size-1.5 shrink-0 rounded-full", style.dot)} aria-hidden />
      {showTime && !event.all_day && <span className="shrink-0 tabular-nums opacity-80">{formatTime(event.starts_at).replace(":00", "")}</span>}
      <span className="truncate font-medium">{event.title}</span>
    </button>
  )
}

export function CalendarView({ events, view, date, today, role, userId, cases, people, workingHours, openEventId }: Props) {
  const { setParams, isPending } = useQueryParams()
  const [openEvent, setOpenEvent] = React.useState<CalendarEvent | null>(
    () => events.find((e) => e.id === openEventId) ?? null
  )

  const byDay = React.useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const e of events) {
      const k = dateKey(e.starts_at)
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(e)
    }
    for (const list of map.values()) {
      list.sort((a, b) => Number(b.all_day) - Number(a.all_day) || a.starts_at.localeCompare(b.starts_at))
    }
    return map
  }, [events])

  const go = (d: string, v: CalendarViewMode = view) => setParams({ date: d, view: v, event: "" }, { resetPage: false })
  const step = (dir: 1 | -1) => {
    if (view === "month") go(addMonthsKey(date, dir))
    else if (view === "week") go(addDaysKey(date, 7 * dir))
    else go(addDaysKey(date, dir))
  }

  const title =
    view === "month"
      ? formatMonthYear(date)
      : view === "week"
        ? `${formatDate(startOfWeekKey(date), "short")} – ${formatDate(addDaysKey(startOfWeekKey(date), 6))}`
        : `${formatWeekday(date)}, ${formatDate(date, "long")}`

  const selectedEvents = byDay.get(date) ?? []
  const openEditable = openEvent ? canEditOwned(role, userId, openEvent.created_by) : false
  const openDeletable = openEvent ? canDeleteOwned(role, userId, openEvent.created_by) : false

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
      <div className="min-w-0 rounded-xl bg-card ring-1 ring-foreground/10">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          <Button variant="outline" size="sm" onClick={() => go(today)}>Today</Button>
          <div className="flex">
            <Button variant="ghost" size="icon-sm" onClick={() => step(-1)} aria-label={`Previous ${view}`}><ChevronLeftIcon /></Button>
            <Button variant="ghost" size="icon-sm" onClick={() => step(1)} aria-label={`Next ${view}`}><ChevronRightIcon /></Button>
          </div>
          <h2 className="min-w-0 flex-1 truncate text-base font-semibold" aria-live="polite">{title}</h2>
          {isPending && <Loader2Icon className="size-4 animate-spin text-muted-foreground" aria-label="Loading" />}
          <div className="flex rounded-lg border p-0.5" role="group" aria-label="Calendar view">
            {(["month", "week", "day"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => go(date, v)}
                aria-pressed={view === v}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors",
                  view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Month view */}
        {view === "month" && (
          <div className="overflow-x-auto">
            <div className="min-w-[640px]">
              <div className="grid grid-cols-7 border-b text-center text-xs font-medium text-muted-foreground">
                {WEEKDAYS.map((d) => <div key={d} className="py-2">{d}</div>)}
              </div>
              <div className="grid grid-cols-7">
                {Array.from({ length: 42 }).map((_, i) => {
                  const k = addDaysKey(startOfWeekKey(startOfMonthKey(date)), i)
                  const inMonth = k.slice(0, 7) === date.slice(0, 7)
                  const list = byDay.get(k) ?? []
                  const selected = k === date
                  return (
                    <div
                      key={k}
                      onClick={() => go(k)}
                      className={cn(
                        "min-h-24 cursor-pointer border-r border-b p-1.5 transition-colors last:border-r-0 hover:bg-muted/40 [&:nth-child(7n)]:border-r-0",
                        !inMonth && "bg-muted/30 text-muted-foreground",
                        selected && "bg-primary/5 ring-2 ring-primary/40 ring-inset"
                      )}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          go(k)
                        }}
                        aria-label={`${formatDate(k, "long")}, ${list.length} event${list.length === 1 ? "" : "s"}`}
                        aria-pressed={selected}
                        className={cn(
                          "mb-1 flex size-6 items-center justify-center rounded-full text-xs font-medium tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          k === today && "bg-primary text-primary-foreground"
                        )}
                      >
                        {Number(k.slice(8))}
                      </button>
                      <div className="grid gap-0.5">
                        {list.slice(0, 3).map((e) => <EventChip key={e.id} event={e} onOpen={setOpenEvent} />)}
                        {list.length > 3 && <span className="px-1 text-[11px] text-muted-foreground">+{list.length - 3} more</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Week view */}
        {view === "week" && (
          <div className="overflow-x-auto">
            <div className="grid min-w-[760px] grid-cols-7">
              {Array.from({ length: 7 }).map((_, i) => {
                const k = addDaysKey(startOfWeekKey(date), i)
                const list = byDay.get(k) ?? []
                return (
                  <div key={k} className={cn("min-h-80 border-r last:border-r-0", k === date && "bg-primary/5")}>
                    <button
                      type="button"
                      onClick={() => go(k)}
                      className="flex w-full flex-col items-center gap-0.5 border-b py-2 outline-none hover:bg-muted/40 focus-visible:bg-muted/40"
                      aria-pressed={k === date}
                    >
                      <span className="text-xs text-muted-foreground">{formatWeekday(k, "short")}</span>
                      <span className={cn("flex size-7 items-center justify-center rounded-full text-sm font-semibold tabular-nums", k === today && "bg-primary text-primary-foreground")}>
                        {Number(k.slice(8))}
                      </span>
                    </button>
                    <div className="grid gap-1 p-1.5">
                      {list.map((e) => <EventChip key={e.id} event={e} onOpen={setOpenEvent} />)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Day view */}
        {view === "day" && (
          <DayTimeline events={selectedEvents} workingHours={workingHours} onOpen={setOpenEvent} />
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 border-t px-3 py-2 text-xs text-muted-foreground">
          {EVENT_TYPES.map((t) => (
            <span key={t.value} className="inline-flex items-center gap-1.5">
              <span className={cn("size-2 rounded-full", EVENT_TYPE_STYLE[t.value].dot)} aria-hidden /> {t.label}
            </span>
          ))}
        </div>
      </div>

      {/* Selected day panel */}
      <aside className="rounded-xl bg-card p-4 ring-1 ring-foreground/10" aria-label={`Events on ${formatDate(date, "long")}`}>
        <p className="text-xs font-medium text-muted-foreground">{formatWeekday(date)}</p>
        <h2 className="text-lg font-semibold">{formatDate(date, "long")}</h2>
        <p className="mt-3 mb-2 text-sm font-medium">{date === today ? "Today's Events" : "Events"}</p>
        {selectedEvents.length === 0 ? (
          <EmptyState icon={CalendarXIcon} title="No events" className="py-8" />
        ) : (
          <ul className="grid gap-2">
            {selectedEvents.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => setOpenEvent(e)}
                  className="flex w-full gap-3 rounded-lg border p-2.5 text-left outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className={cn("w-1 shrink-0 self-stretch rounded-full", EVENT_TYPE_STYLE[e.event_type].dot)} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold tabular-nums">{e.all_day ? "All day" : formatTime(e.starts_at)}</span>
                    <span className="block text-xs text-muted-foreground">{labelOf(EVENT_TYPES, e.event_type)}</span>
                    <span className="block truncate text-sm font-medium">{e.case ? `Case #${e.case.case_number}` : e.title}</span>
                    {e.case && <span className="block truncate text-xs text-muted-foreground">{e.title}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {role !== "viewer" && (
          <Link href={`/calendar/new?date=${date}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-4 w-full")}>
            <CalendarPlusIcon aria-hidden /> Add event on this day
          </Link>
        )}
      </aside>

      <EventDetailDialog
        event={openEvent}
        onClose={() => setOpenEvent(null)}
        canEdit={openEditable}
        canDelete={openDeletable}
        cases={cases}
        people={people}
      />
    </div>
  )
}

function DayTimeline({
  events,
  workingHours,
  onOpen,
}: {
  events: CalendarEvent[]
  workingHours: { start: number; end: number }
  onOpen: (e: CalendarEvent) => void
}) {
  const allDay = events.filter((e) => e.all_day)
  const timed = events.filter((e) => !e.all_day)
  const hours = timed.map((e) => Number(timeKey(e.starts_at).slice(0, 2)))
  const first = Math.min(workingHours.start, ...hours)
  const last = Math.max(workingHours.end, ...hours.map((h) => h + 1))

  return (
    <div className="grid">
      {allDay.length > 0 && (
        <div className="grid grid-cols-[64px_1fr] border-b">
          <div className="p-2 text-xs text-muted-foreground">All day</div>
          <div className="grid gap-1 p-1.5">{allDay.map((e) => <EventChip key={e.id} event={e} onOpen={onOpen} showTime={false} />)}</div>
        </div>
      )}
      {Array.from({ length: last - first }).map((_, i) => {
        const hour = first + i
        const inHour = timed.filter((e) => Number(timeKey(e.starts_at).slice(0, 2)) === hour)
        const label = new Date(Date.UTC(2000, 0, 1, hour)).toLocaleTimeString("en-US", { hour: "numeric", timeZone: "UTC" })
        const offHours = hour < workingHours.start || hour >= workingHours.end
        return (
          <div key={hour} className={cn("grid min-h-12 grid-cols-[64px_1fr] border-b last:border-b-0", offHours && "bg-muted/30")}>
            <div className="p-2 text-xs text-muted-foreground tabular-nums">{label}</div>
            <div className="grid content-start gap-1 border-l p-1.5">
              {inHour.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => onOpen(e)}
                  className={cn("rounded-md border px-2 py-1.5 text-left text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring", EVENT_TYPE_STYLE[e.event_type].chip)}
                >
                  <span className="font-semibold">{eventTimeLabel(e)}</span> · <span className="font-medium">{e.title}</span>
                  {e.location && <span className="block opacity-80">{e.location}</span>}
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
