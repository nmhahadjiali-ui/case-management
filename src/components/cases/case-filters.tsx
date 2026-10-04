"use client"

import { FilterXIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/shared/native-select"
import { useQueryParams } from "@/hooks/use-query-params"
import { CASE_PRIORITIES, CASE_STATUSES } from "@/lib/constants"
import type { CaseFilters as Filters } from "@/lib/data/cases"
import type { CaseType, ProfileOption } from "@/lib/types"

const DUE_LABELS: Record<string, string> = { overdue: "Overdue", week: "Due this week" }

export function CaseFilters({
  filters,
  caseTypes,
  staff,
}: {
  filters: Filters
  caseTypes: CaseType[]
  staff: ProfileOption[]
}) {
  const { setParams } = useQueryParams()
  const active = Boolean(
    filters.type || filters.status || filters.priority || filters.assigned || filters.from || filters.to || filters.due || filters.q
  )

  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <div className="grid gap-1">
          <Label htmlFor="f-type" className="text-xs text-muted-foreground">Case type</Label>
          <NativeSelect id="f-type" value={filters.type} onChange={(e) => setParams({ type: e.target.value })}>
            <option value="">All types</option>
            {caseTypes.map((t) => (
              <option key={t.id} value={t.slug}>{t.name}</option>
            ))}
          </NativeSelect>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="f-status" className="text-xs text-muted-foreground">Status</Label>
          <NativeSelect id="f-status" value={filters.status} onChange={(e) => setParams({ status: e.target.value })}>
            <option value="">All (excl. archived)</option>
            {CASE_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
            <option value="all">All including archived</option>
          </NativeSelect>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="f-priority" className="text-xs text-muted-foreground">Priority</Label>
          <NativeSelect id="f-priority" value={filters.priority} onChange={(e) => setParams({ priority: e.target.value })}>
            <option value="">All priorities</option>
            {CASE_PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </NativeSelect>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="f-assigned" className="text-xs text-muted-foreground">Assigned staff</Label>
          <NativeSelect id="f-assigned" value={filters.assigned} onChange={(e) => setParams({ assigned: e.target.value })}>
            <option value="">Anyone</option>
            <option value="me">Assigned to me</option>
            <option value="unassigned">Unassigned</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>{s.full_name}</option>
            ))}
          </NativeSelect>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="f-from" className="text-xs text-muted-foreground">Filed from</Label>
          <Input id="f-from" type="date" value={filters.from} max={filters.to || undefined} onChange={(e) => setParams({ from: e.target.value })} />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="f-to" className="text-xs text-muted-foreground">Filed to</Label>
          <Input id="f-to" type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => setParams({ to: e.target.value })} />
        </div>
      </div>
      {active && (
        <div className="flex flex-wrap items-center gap-2">
          {filters.due && (
            <span className="inline-flex items-center gap-1 rounded-full border bg-muted px-2.5 py-0.5 text-xs font-medium">
              {DUE_LABELS[filters.due]}
              <button type="button" onClick={() => setParams({ due: "" })} aria-label="Remove deadline filter" className="rounded-full hover:text-destructive">
                <XIcon className="size-3" />
              </button>
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setParams({ type: "", status: "", priority: "", assigned: "", from: "", to: "", due: "", q: "" })}
          >
            <FilterXIcon /> Clear filters
          </Button>
        </div>
      )}
    </div>
  )
}
