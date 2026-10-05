"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArchiveIcon,
  BriefcaseIcon,
  EyeIcon,
  MoreHorizontalIcon,
  PencilIcon,
  RefreshCwIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react"
import { toast } from "sonner"
import { Button, buttonVariants } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CasePriorityBadge, CaseStatusBadge } from "@/components/shared/badges"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { EmptyState } from "@/components/shared/empty-state"
import { archiveCases, deleteCases, updateCasesBulk } from "@/lib/actions/cases"
import { CASE_STATUSES } from "@/lib/constants"
import { formatDate, formatDateTime } from "@/lib/datetime"
import { canEditCase, canManage, canWrite } from "@/lib/permissions"
import { cn } from "@/lib/utils"
import type { UserRole } from "@/lib/constants"
import type { CaseListItem } from "@/lib/types"
import type { ActionResult } from "@/lib/action-result"

type Confirm = { kind: "delete" | "archive"; ids: string[] } | null

export function CaseTable({
  rows,
  role,
  userId,
  hasFilters,
}: {
  rows: CaseListItem[]
  role: UserRole
  userId: string
  hasFilters: boolean
}) {
  const router = useRouter()
  const [confirm, setConfirm] = React.useState<Confirm>(null)
  const [busy, setBusy] = React.useState(false)

  // The selection belongs to the visible page; changing page/filters clears it.
  const rowKey = rows.map((r) => r.id).join(",")
  const [selection, setSelection] = React.useState<{ key: string; ids: Set<string> }>({ key: rowKey, ids: new Set() })
  const selected = selection.key === rowKey ? selection.ids : new Set<string>()
  const setSelected = (next: Set<string> | ((prev: Set<string>) => Set<string>)) =>
    setSelection({ key: rowKey, ids: typeof next === "function" ? next(selected) : next })

  const allSelected = rows.length > 0 && selected.size === rows.length
  const someSelected = selected.size > 0 && !allSelected
  const writable = canWrite(role)
  const manager = canManage(role)

  function toggle(id: string, on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })
  }

  async function run(action: () => Promise<ActionResult>) {
    setBusy(true)
    try {
      const res = await action()
      if (res.ok) {
        toast.success(res.message ?? "Done.")
        setSelected(new Set())
        router.refresh()
        return true
      }
      toast.error(res.error)
      return false
    } finally {
      setBusy(false)
    }
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={BriefcaseIcon}
        title="No cases found."
        description={hasFilters ? "Try changing your search or filters, or create a new case." : "Create your first case to get started."}
        action={writable && <Link href="/cases/new" className={buttonVariants()}>New Case</Link>}
      />
    )
  }

  const ids = [...selected]

  function RowMenu({ c }: { c: CaseListItem }) {
    const editable = canEditCase(role, userId, c)
    return (
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for case ${c.case_number}`} />}>
          <MoreHorizontalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={() => router.push(`/cases/${c.id}`)}>
            <EyeIcon /> View
          </DropdownMenuItem>
          {editable && (
            <DropdownMenuItem onClick={() => router.push(`/cases/${c.id}/edit`)}>
              <PencilIcon /> Edit
            </DropdownMenuItem>
          )}
          {editable && c.status !== "archived" && (
            <DropdownMenuItem onClick={() => setConfirm({ kind: "archive", ids: [c.id] })}>
              <ArchiveIcon /> Archive
            </DropdownMenuItem>
          )}
          {manager && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setConfirm({ kind: "delete", ids: [c.id] })}>
                <Trash2Icon /> Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <div className="grid gap-3">
      {/* Bulk action bar */}
      {writable && selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-sm" role="region" aria-label="Bulk actions">
          <span className="font-medium">{selected.size} selected</span>
          <Button variant="ghost" size="icon-xs" onClick={() => setSelected(new Set())} aria-label="Clear selection">
            <XIcon />
          </Button>
          <div className="ml-auto flex flex-wrap gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" size="sm" disabled={busy} />}>
                <RefreshCwIcon /> Change status
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Set status to</DropdownMenuLabel>
                  {CASE_STATUSES.map((s) => (
                    <DropdownMenuItem key={s.value} onClick={() => run(() => updateCasesBulk(ids, { status: s.value }))}>
                      {s.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm" disabled={busy} onClick={() => setConfirm({ kind: "archive", ids })}>
              <ArchiveIcon /> Archive
            </Button>
            {manager && (
              <Button variant="destructive" size="sm" disabled={busy} onClick={() => setConfirm({ kind: "delete", ids })}>
                <Trash2Icon /> Delete
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Desktop / tablet table */}
      <div className="hidden overflow-hidden rounded-lg border bg-card md:block">
        <Table className="bg-card">
          <TableHeader className="bg-card">
            <TableRow>
              {writable && (
                <TableHead className="w-10">
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onCheckedChange={(v) => setSelected(v ? new Set(rows.map((r) => r.id)) : new Set())}
                    aria-label="Select all cases on this page"
                  />
                </TableHead>
              )}
              <TableHead>Case Number</TableHead>
              <TableHead>Complainant</TableHead>
              <TableHead>Defendant</TableHead>
              <TableHead>Case Type</TableHead>
              <TableHead>Date Filed</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Next Hearing</TableHead>
              <TableHead className="w-12"><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((c) => (
              <TableRow key={c.id} data-state={selected.has(c.id) ? "selected" : undefined}>
                {writable && (
                  <TableCell>
                    <Checkbox
                      checked={selected.has(c.id)}
                      onCheckedChange={(v) => toggle(c.id, Boolean(v))}
                      aria-label={`Select case ${c.case_number}`}
                    />
                  </TableCell>
                )}
                <TableCell className="max-w-56">
                  <Link href={`/cases/${c.id}`} className="font-medium text-primary hover:underline">
                    {c.case_number}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground" title={c.title}>{c.title}</p>
                </TableCell>
                <TableCell className="max-w-40 truncate" title={c.complainants ?? ""}>{c.complainants ?? "—"}</TableCell>
                <TableCell className="max-w-40 truncate" title={c.defendants ?? ""}>{c.defendants ?? "—"}</TableCell>
                <TableCell>{c.case_type_name}</TableCell>
                <TableCell className="whitespace-nowrap">{formatDate(c.date_filed)}</TableCell>
                <TableCell><CaseStatusBadge status={c.status} /></TableCell>
                <TableCell><CasePriorityBadge priority={c.priority} /></TableCell>
                <TableCell className="whitespace-nowrap">{c.next_hearing ? formatDateTime(c.next_hearing) : "—"}</TableCell>
                <TableCell><RowMenu c={c} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <ul className="grid gap-3 md:hidden">
        {rows.map((c) => (
          <li key={c.id} className={cn("rounded-lg border bg-card p-3", selected.has(c.id) && "ring-2 ring-primary/40")}>
            <div className="flex items-start gap-3">
              {writable && (
                <Checkbox
                  className="mt-1"
                  checked={selected.has(c.id)}
                  onCheckedChange={(v) => toggle(c.id, Boolean(v))}
                  aria-label={`Select case ${c.case_number}`}
                />
              )}
              <div className="min-w-0 flex-1">
                <Link href={`/cases/${c.id}`} className="text-sm font-semibold text-primary hover:underline">
                  {c.case_number}
                </Link>
                <p className="truncate text-sm">{c.title}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <CaseStatusBadge status={c.status} />
                  <CasePriorityBadge priority={c.priority} />
                  <span className="text-xs text-muted-foreground">{c.case_type_name}</span>
                </div>
                <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
                  <dt className="text-muted-foreground">Complainant</dt><dd className="truncate">{c.complainants ?? "—"}</dd>
                  <dt className="text-muted-foreground">Defendant</dt><dd className="truncate">{c.defendants ?? "—"}</dd>
                  <dt className="text-muted-foreground">Filed</dt><dd>{formatDate(c.date_filed)}</dd>
                  <dt className="text-muted-foreground">Next hearing</dt><dd>{c.next_hearing ? formatDateTime(c.next_hearing) : "—"}</dd>
                </dl>
              </div>
              <RowMenu c={c} />
            </div>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={
          confirm?.kind === "delete"
            ? `Delete ${confirm.ids.length === 1 ? "case" : `${confirm.ids.length} cases`}?`
            : `Archive ${confirm?.ids.length === 1 ? "case" : `${confirm?.ids.length} cases`}?`
        }
        description={
          confirm?.kind === "delete"
            ? "This action cannot be undone. All parties, hearings, tasks, notes and documents linked to the case will also be deleted."
            : "Archived cases are hidden from the default list but can still be found with the “All including archived” filter."
        }
        confirmLabel={confirm?.kind === "delete" ? "Delete" : "Archive"}
        destructive={confirm?.kind === "delete"}
        onConfirm={() => (confirm ? run(() => (confirm.kind === "delete" ? deleteCases(confirm.ids) : archiveCases(confirm.ids))) : undefined)}
      />
    </div>
  )
}
