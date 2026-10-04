import type { Metadata } from "next"
import { FileClockIcon } from "lucide-react"
import { SettingsSection } from "@/components/settings/settings-section"
import { AuditFilters } from "@/components/settings/audit-filters"
import { SearchInput } from "@/components/shared/search-input"
import { Pagination } from "@/components/shared/pagination"
import { EmptyState } from "@/components/shared/empty-state"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { sanitizeSearch } from "@/lib/data/cases"
import { addDaysKey, formatDateTime, isValidDateKey, zonedToUtc } from "@/lib/datetime"
import { PAGE_SIZES } from "@/lib/constants"
import type { ActivityLog, ProfileOption } from "@/lib/types"

export const metadata: Metadata = { title: "Audit Logs" }

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ""
const ENTITY_TYPES = ["case", "person", "event", "task", "document", "user"]

export default async function AuditLogsPage({ searchParams }: PageProps<"/settings/audit-logs">) {
  await requireRole("administrator")
  const params = await searchParams
  const entity = ENTITY_TYPES.includes(one(params.entity)) ? one(params.entity) : ""
  const user = one(params.user)
  const from = isValidDateKey(one(params.from)) ? one(params.from) : ""
  const to = isValidDateKey(one(params.to)) ? one(params.to) : ""
  const q = sanitizeSearch(one(params.q))
  const page = Math.max(1, Number(one(params.page)) || 1)
  const per = (PAGE_SIZES as readonly number[]).includes(Number(one(params.per))) ? Number(one(params.per)) : 20

  const supabase = await createClient()
  let query = supabase.from("activity_logs").select("*, user:profiles(full_name)", { count: "exact" })
  if (entity) query = query.eq("entity_type", entity)
  if (user) query = query.eq("user_id", user)
  if (from) query = query.gte("created_at", zonedToUtc(from).toISOString())
  if (to) query = query.lt("created_at", zonedToUtc(addDaysKey(to, 1)).toISOString())
  if (q) query = query.or(`description.ilike.%${q}%,action.ilike.%${q}%`)

  const [{ data, count }, { data: users }] = await Promise.all([
    query.order("created_at", { ascending: false }).range((page - 1) * per, page * per - 1),
    supabase.from("profiles").select("id, full_name, role").order("full_name"),
  ])
  const rows = (data ?? []) as unknown as ActivityLog[]

  return (
    <SettingsSection title="Audit logs" description="Every create, update and delete is recorded automatically by the database.">
      <div className="grid gap-4">
        <SearchInput placeholder="Search descriptions…" />
        <AuditFilters entity={entity} user={user} from={from} to={to} users={(users ?? []) as ProfileOption[]} />
        {rows.length === 0 ? (
          <EmptyState icon={FileClockIcon} title="No log entries match these filters." />
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table className="min-w-[720px]">
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap tabular-nums">{formatDateTime(r.created_at)}</TableCell>
                    <TableCell className="whitespace-nowrap">{r.user?.full_name ?? "System"}</TableCell>
                    <TableCell><code className="rounded bg-muted px-1.5 py-0.5 text-xs">{r.action}</code></TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.entity_type}
                      {r.entity_id && <span className="block font-mono text-[10px]" title={r.entity_id}>{r.entity_id.slice(0, 8)}</span>}
                    </TableCell>
                    <TableCell className="max-w-md whitespace-normal">{r.description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <Pagination page={page} perPage={per} total={count ?? 0} />
      </div>
    </SettingsSection>
  )
}
