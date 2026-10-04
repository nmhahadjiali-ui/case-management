import Link from "next/link"
import { CalendarXIcon, ClockIcon, MapPinIcon } from "lucide-react"
import { EventStatusBadge } from "@/components/shared/badges"
import { EmptyState } from "@/components/shared/empty-state"
import { dateKey, formatTime } from "@/lib/datetime"
import type { CalendarEvent } from "@/lib/types"

export function HearingsList({ hearings }: { hearings: CalendarEvent[] }) {
  if (!hearings.length) {
    return <EmptyState icon={CalendarXIcon} title="No upcoming hearings" description="Scheduled hearings will appear here." />
  }
  return (
    <ul className="divide-y">
      {hearings.map((h) => {
        const d = new Date(h.starts_at)
        const key = dateKey(d)
        const month = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(new Date(`${key}T00:00:00Z`))
        return (
          <li key={h.id}>
            <Link
              href={h.case ? `/cases/${h.case.id}?tab=hearings` : `/calendar?date=${key}&type=hearing`}
              className="flex items-start gap-3 rounded-md px-1 py-3 outline-none hover:bg-muted/50 focus-visible:bg-muted/50"
            >
              <div className="flex w-12 shrink-0 flex-col items-center rounded-lg border bg-muted/40 py-1 leading-tight">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">{month}</span>
                <span className="text-lg font-semibold tabular-nums">{Number(key.slice(8))}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-muted-foreground">{h.case?.case_number ?? "No case"}</p>
                <p className="truncate text-sm font-medium">{h.case?.title ?? h.title}</p>
                <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <ClockIcon className="size-3" aria-hidden /> {formatTime(d)}
                  </span>
                  {h.location && (
                    <span className="inline-flex min-w-0 items-center gap-1">
                      <MapPinIcon className="size-3 shrink-0" aria-hidden /> <span className="truncate">{h.location}</span>
                    </span>
                  )}
                  {h.subtype && <span>{h.subtype}</span>}
                </div>
              </div>
              <EventStatusBadge status={h.status} />
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
