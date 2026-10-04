"use client"

import { NativeSelect } from "@/components/shared/native-select"
import { useQueryParams } from "@/hooks/use-query-params"
import { TASK_FILTERS, TASK_PRIORITIES, type TaskFilter } from "@/lib/constants"
import type { TaskFilters as Filters } from "@/lib/data/tasks"
import { cn } from "@/lib/utils"
import type { ProfileOption } from "@/lib/types"

export function TaskFilters({
  filters,
  counts,
  staff,
}: {
  filters: Filters
  counts: Record<TaskFilter, number>
  staff: ProfileOption[]
}) {
  const { setParams } = useQueryParams()
  return (
    <div className="grid gap-3">
      <div className="-mx-1 overflow-x-auto px-1">
        <div className="flex w-max gap-1 rounded-lg bg-muted p-1" role="group" aria-label="Task filter">
          {TASK_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={filters.filter === f.value}
              onClick={() => setParams({ filter: f.value === "all" ? "" : f.value })}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                filters.filter === f.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
              <span
                className={cn(
                  "rounded-full px-1.5 text-[11px] tabular-nums",
                  f.value === "overdue" && counts.overdue > 0 ? "bg-red-500/15 text-red-700 dark:text-red-300" : "bg-foreground/5"
                )}
              >
                {counts[f.value]}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <NativeSelect value={filters.priority} onChange={(e) => setParams({ priority: e.target.value })} aria-label="Filter by priority" className="w-40">
          <option value="">All priorities</option>
          {TASK_PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </NativeSelect>
        <NativeSelect value={filters.assignee} onChange={(e) => setParams({ assignee: e.target.value })} aria-label="Filter by assignee" className="w-48">
          <option value="">Anyone</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>{s.full_name}</option>
          ))}
        </NativeSelect>
      </div>
    </div>
  )
}
