"use client"

import { FilterXIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { NativeSelect } from "@/components/shared/native-select"
import { useQueryParams } from "@/hooks/use-query-params"
import { PARTY_ROLES } from "@/lib/constants"
import type { PeopleFilters as Filters } from "@/lib/data/people"
import type { CaseType } from "@/lib/types"

export function PeopleFilters({ filters, caseTypes }: { filters: Filters; caseTypes: CaseType[] }) {
  const { setParams } = useQueryParams()
  const active = Boolean(filters.role || filters.status || filters.type || filters.q)
  return (
    <div className="flex flex-wrap items-center gap-2">
      <NativeSelect value={filters.role} onChange={(e) => setParams({ role: e.target.value })} aria-label="Filter by role" className="w-40">
        <option value="">All roles</option>
        {PARTY_ROLES.map((r) => (
          <option key={r.value} value={r.value}>{r.label}</option>
        ))}
      </NativeSelect>
      <NativeSelect value={filters.type} onChange={(e) => setParams({ type: e.target.value })} aria-label="Filter by case type" className="w-40">
        <option value="">All case types</option>
        {caseTypes.map((t) => (
          <option key={t.id} value={t.name}>{t.name}</option>
        ))}
      </NativeSelect>
      <NativeSelect value={filters.status} onChange={(e) => setParams({ status: e.target.value })} aria-label="Filter by status" className="w-32">
        <option value="">Any status</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </NativeSelect>
      {active && (
        <Button variant="ghost" size="sm" onClick={() => setParams({ role: "", type: "", status: "", q: "" })}>
          <FilterXIcon /> Clear
        </Button>
      )}
    </div>
  )
}
