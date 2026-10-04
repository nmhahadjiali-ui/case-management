"use client"

import { useQueryParams } from "@/hooks/use-query-params"
import { EVENT_TYPE_STYLE, type EventType } from "@/lib/constants"
import { cn } from "@/lib/utils"

const FILTERS: { value: "" | EventType; label: string }[] = [
  { value: "", label: "All Events" },
  { value: "hearing", label: "Hearings" },
  { value: "conference", label: "Conferences" },
  { value: "deadline", label: "Deadlines" },
  { value: "appointment", label: "Appointments" },
  { value: "meeting", label: "Meetings" },
]

export function CalendarFilters({ type }: { type: string }) {
  const { setParams } = useQueryParams()
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter events by type">
      {FILTERS.map((f) => (
        <button
          key={f.value}
          type="button"
          onClick={() => setParams({ type: f.value, event: "" }, { resetPage: false })}
          aria-pressed={type === f.value}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
            type === f.value ? "border-primary bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:text-foreground"
          )}
        >
          {f.value && <span className={cn("size-1.5 rounded-full", EVENT_TYPE_STYLE[f.value].dot)} aria-hidden />}
          {f.label}
        </button>
      ))}
    </div>
  )
}
