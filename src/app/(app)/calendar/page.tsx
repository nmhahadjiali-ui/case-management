import type { Metadata } from "next"
import Link from "next/link"
import { CalendarPlusIcon } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/page-header"
import { SearchInput } from "@/components/shared/search-input"
import { CalendarFilters } from "@/components/calendar/calendar-filters"
import { CalendarView, type CalendarViewMode } from "@/components/calendar/calendar-view"
import { requireSession } from "@/lib/auth"
import { listEvents } from "@/lib/data/events"
import { getCaseOptions, getPersonOptions } from "@/lib/data/lookups"
import { createClient } from "@/lib/supabase/server"
import { EVENT_TYPES } from "@/lib/constants"
import { addDaysKey, isValidDateKey, startOfMonthKey, startOfWeekKey, todayKey } from "@/lib/datetime"
import { canWrite } from "@/lib/permissions"
import type { UserSettings } from "@/lib/types"

export const metadata: Metadata = { title: "Calendar" }

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ""

export default async function CalendarPage({ searchParams }: PageProps<"/calendar">) {
  const supabase = await createClient()
  // RLS returns only the signed-in user's settings row, so no user id is needed here.
  const [session, params, { data: settings }, cases, people] = await Promise.all([
    requireSession(),
    searchParams,
    supabase
      .from("user_settings")
      .select("default_calendar_view, working_hours_start, working_hours_end")
      .maybeSingle<Pick<UserSettings, "default_calendar_view" | "working_hours_start" | "working_hours_end">>(),
    getCaseOptions(),
    getPersonOptions(),
  ])

  const today = todayKey()
  const viewParam = one(params.view)
  const view: CalendarViewMode = ["month", "week", "day"].includes(viewParam)
    ? (viewParam as CalendarViewMode)
    : (settings?.default_calendar_view ?? "month")
  const date = isValidDateKey(one(params.date)) ? one(params.date) : today
  const typeParam = one(params.type)
  const type = EVENT_TYPES.some((t) => t.value === typeParam) ? typeParam : ""
  const q = one(params.q)

  // Visible range for the chosen view
  const startKey = view === "month" ? startOfWeekKey(startOfMonthKey(date)) : view === "week" ? startOfWeekKey(date) : date
  const endKey = view === "month" ? addDaysKey(startKey, 41) : view === "week" ? addDaysKey(startKey, 6) : date
  // Always include the selected day so the side panel is complete.
  const rangeStart = date < startKey ? date : startKey
  const rangeEnd = date > endKey ? date : endKey

  const events = await listEvents({ startKey: rangeStart, endKey: rangeEnd, type, q })

  const hour = (t: string | undefined, fallback: number) => (t ? Number(t.slice(0, 2)) : fallback)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendar"
        description="Hearings, conferences, deadlines and appointments."
        actions={
          canWrite(session.profile.role) && (
            <Link href={`/calendar/new?date=${date}`} className={buttonVariants()}>
              <CalendarPlusIcon aria-hidden /> New Event
            </Link>
          )
        }
      />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SearchInput placeholder="Search events…" />
        <CalendarFilters type={type} />
      </div>
      <CalendarView
        key={`${view}-${type}-${q}`}
        events={events}
        view={view}
        date={date}
        today={today}
        role={session.profile.role}
        userId={session.userId}
        cases={cases}
        people={people}
        workingHours={{ start: hour(settings?.working_hours_start, 8), end: hour(settings?.working_hours_end, 17) }}
        openEventId={one(params.event) || undefined}
      />
    </div>
  )
}
