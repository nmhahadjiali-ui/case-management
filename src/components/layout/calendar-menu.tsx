"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CalendarDaysIcon, CalendarXIcon, ChevronLeftIcon, ChevronRightIcon, Loader2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { createClient } from "@/lib/supabase/client"
import { EVENT_TYPE_STYLE } from "@/lib/constants"
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
  todayKey,
  zonedToUtc,
} from "@/lib/datetime"
import { cn } from "@/lib/utils"
import type { CalendarViewMode } from "@/components/calendar/calendar-view"
import type { CalendarEvent } from "@/lib/types"

type MenuEvent = Pick<CalendarEvent, "id" | "title" | "event_type" | "status" | "starts_at" | "all_day" | "location"> & {
  case: { case_number: string } | null
}

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"]

function rangeFor(view: CalendarViewMode, date: string) {
  const start = view === "month" ? startOfWeekKey(startOfMonthKey(date)) : view === "week" ? startOfWeekKey(date) : date
  const end = view === "month" ? addDaysKey(start, 41) : view === "week" ? addDaysKey(start, 6) : date
  return { start, end }
}

export function CalendarMenu() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [view, setView] = React.useState<CalendarViewMode>("month")
  const [date, setDate] = React.useState(todayKey)
  const [loaded, setLoaded] = React.useState<{ range: string; events: MenuEvent[] }>({ range: "", events: [] })
  const today = todayKey()
  const { start, end } = rangeFor(view, date)
  const range = `${start}|${end}`
  const loading = open && loaded.range !== range
  const events = loaded.events

  React.useEffect(() => {
    if (!open) return
    let cancelled = false
    createClient()
      .from("events")
      .select("id, title, event_type, status, starts_at, all_day, location, case:cases(case_number)")
      .gte("starts_at", zonedToUtc(start).toISOString())
      .lt("starts_at", zonedToUtc(addDaysKey(end, 1)).toISOString())
      .order("starts_at")
      .limit(500)
      .then(({ data }) => {
        if (cancelled) return
        setLoaded({ range: `${start}|${end}`, events: (data ?? []) as unknown as MenuEvent[] })
      })
    return () => {
      cancelled = true
    }
  }, [open, start, end])

  const byDay = React.useMemo(() => {
    const map = new Map<string, MenuEvent[]>()
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

  const step = (dir: 1 | -1) =>
    setDate((d) => (view === "month" ? addMonthsKey(d, dir) : addDaysKey(d, view === "week" ? 7 * dir : dir)))

  const title =
    view === "month"
      ? formatMonthYear(date)
      : view === "week"
        ? `${formatDate(start, "short")} – ${formatDate(end, "short")}`
        : `${formatWeekday(date, "short")}, ${formatDate(date)}`

  function openEvent(e: MenuEvent) {
    setOpen(false)
    router.push(`/calendar?view=day&date=${dateKey(e.starts_at)}&event=${e.id}`)
  }

  function openDay(k: string) {
    setDate(k)
    setView("day")
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button variant="ghost" size="icon" aria-label="Calendar" />}>
        <CalendarDaysIcon />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))] gap-0 p-0">
        {/* Toolbar */}
        <div className="flex items-center gap-1 border-b px-2 py-2">
          <Button variant="ghost" size="icon-sm" onClick={() => step(-1)} aria-label={`Previous ${view}`}>
            <ChevronLeftIcon />
          </Button>
          <p className="min-w-0 flex-1 truncate text-center text-sm font-semibold" aria-live="polite">{title}</p>
          {loading && <Loader2Icon className="size-3.5 animate-spin text-muted-foreground" aria-label="Loading" />}
          <Button variant="ghost" size="icon-sm" onClick={() => step(1)} aria-label={`Next ${view}`}>
            <ChevronRightIcon />
          </Button>
        </div>
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <div className="flex flex-1 rounded-lg border p-0.5" role="group" aria-label="Calendar view">
            {(["month", "week", "day"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                aria-pressed={view === v}
                className={cn(
                  "flex-1 rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors",
                  view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {v}
              </button>
            ))}
          </div>
          <Button variant="outline" size="xs" onClick={() => setDate(today)}>Today</Button>
        </div>

        {/* Month */}
        {view === "month" && (
          <div className="p-2">
            <div className="grid grid-cols-7 pb-1 text-center text-[11px] font-medium text-muted-foreground">
              {WEEKDAYS.map((d, i) => <div key={i}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {Array.from({ length: 42 }).map((_, i) => {
                const k = addDaysKey(start, i)
                const list = byDay.get(k) ?? []
                const inMonth = k.slice(0, 7) === date.slice(0, 7)
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => openDay(k)}
                    aria-label={`${formatDate(k, "long")}, ${list.length} event${list.length === 1 ? "" : "s"}`}
                    className={cn(
                      "flex h-11 flex-col items-center gap-1 rounded-md pt-1 outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
                      !inMonth && "text-muted-foreground/60"
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-6 items-center justify-center rounded-full text-xs tabular-nums",
                        k === today && "bg-primary font-semibold text-primary-foreground"
                      )}
                    >
                      {Number(k.slice(8))}
                    </span>
                    <span className="flex gap-0.5" aria-hidden>
                      {list.slice(0, 3).map((e) => (
                        <span key={e.id} className={cn("size-1.5 rounded-full", EVENT_TYPE_STYLE[e.event_type].dot)} />
                      ))}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Week */}
        {view === "week" && (
          <ul className="max-h-96 overflow-y-auto">
            {Array.from({ length: 7 }).map((_, i) => {
              const k = addDaysKey(start, i)
              const list = byDay.get(k) ?? []
              return (
                <li key={k} className="flex gap-3 border-b px-3 py-2 last:border-b-0">
                  <button
                    type="button"
                    onClick={() => openDay(k)}
                    className="flex w-10 shrink-0 flex-col items-center rounded-md py-0.5 outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="text-[11px] text-muted-foreground">{formatWeekday(k, "short")}</span>
                    <span
                      className={cn(
                        "flex size-6 items-center justify-center rounded-full text-sm font-semibold tabular-nums",
                        k === today && "bg-primary text-primary-foreground"
                      )}
                    >
                      {Number(k.slice(8))}
                    </span>
                  </button>
                  <div className="grid min-w-0 flex-1 content-start gap-1 py-0.5">
                    {list.length === 0 && <span className="pt-1.5 text-xs text-muted-foreground">No events</span>}
                    {list.map((e) => <EventRow key={e.id} event={e} onOpen={openEvent} compact />)}
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {/* Day */}
        {view === "day" && (
          <div className="max-h-96 overflow-y-auto p-2">
            {(byDay.get(date) ?? []).length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-sm text-muted-foreground">
                <CalendarXIcon className="size-6" aria-hidden />
                {loading ? "Loading…" : "No events"}
              </div>
            ) : (
              <div className="grid gap-1.5">
                {byDay.get(date)!.map((e) => <EventRow key={e.id} event={e} onOpen={openEvent} />)}
              </div>
            )}
          </div>
        )}

        <div className="border-t p-2">
          <Link
            href={`/calendar?view=${view}&date=${date}`}
            onClick={() => setOpen(false)}
            className="block rounded-md py-1.5 text-center text-sm font-medium text-primary hover:bg-muted"
          >
            Open full calendar
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function EventRow({ event, onOpen, compact }: { event: MenuEvent; onOpen: (e: MenuEvent) => void; compact?: boolean }) {
  const time = event.all_day ? "All day" : formatTime(event.starts_at)
  return (
    <button
      type="button"
      onClick={() => onOpen(event)}
      title={`${event.title} · ${time}`}
      className={cn(
        "flex w-full min-w-0 gap-2 rounded-md text-left outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
        compact ? "items-center px-1.5 py-1 text-xs" : "border p-2 text-sm",
        event.status === "cancelled" && "line-through opacity-60"
      )}
    >
      <span
        className={cn("shrink-0 rounded-full", EVENT_TYPE_STYLE[event.event_type].dot, compact ? "size-1.5" : "w-1 self-stretch")}
        aria-hidden
      />
      {compact ? (
        <>
          <span className="shrink-0 text-muted-foreground tabular-nums">{time}</span>
          <span className="truncate font-medium">{event.title}</span>
        </>
      ) : (
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-semibold tabular-nums">{time}</span>
          <span className="block truncate font-medium">{event.title}</span>
          {(event.case || event.location) && (
            <span className="block truncate text-xs text-muted-foreground">
              {[event.case && `Case #${event.case.case_number}`, event.location].filter(Boolean).join(" · ")}
            </span>
          )}
        </span>
      )}
    </button>
  )
}
