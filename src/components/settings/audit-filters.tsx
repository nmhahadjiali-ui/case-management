"use client"

import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/shared/native-select"
import { useQueryParams } from "@/hooks/use-query-params"
import type { ProfileOption } from "@/lib/types"

const ENTITIES = [
  { value: "case", label: "Cases" },
  { value: "person", label: "People" },
  { value: "event", label: "Events" },
  { value: "task", label: "Tasks" },
  { value: "document", label: "Documents" },
  { value: "user", label: "Sign-ins" },
]

export function AuditFilters({
  entity,
  user,
  from,
  to,
  users,
}: {
  entity: string
  user: string
  from: string
  to: string
  users: ProfileOption[]
}) {
  const { setParams } = useQueryParams()
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
      <NativeSelect value={entity} onChange={(e) => setParams({ entity: e.target.value })} aria-label="Entity type">
        <option value="">All entities</option>
        {ENTITIES.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
      </NativeSelect>
      <NativeSelect value={user} onChange={(e) => setParams({ user: e.target.value })} aria-label="User">
        <option value="">All users</option>
        {users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
      </NativeSelect>
      <Input type="date" value={from} onChange={(e) => setParams({ from: e.target.value })} aria-label="From date" />
      <Input type="date" value={to} onChange={(e) => setParams({ to: e.target.value })} aria-label="To date" />
    </div>
  )
}
