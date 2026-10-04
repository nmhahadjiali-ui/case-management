"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader2Icon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { FormField } from "@/components/shared/form-field"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { deleteLookup, saveLookup, setCaseTypeActive, type LookupKind } from "@/lib/actions/settings"

export type LookupItem = { id: string; name: string; extra?: string | null; is_active?: boolean; usage?: number }

/** List editor for a simple reference table (administrators only). */
export function LookupManager({
  kind,
  noun,
  items,
  editable,
  extraLabel,
}: {
  kind: LookupKind
  noun: string
  items: LookupItem[]
  editable: boolean
  extraLabel?: string
}) {
  const router = useRouter()
  const [editing, setEditing] = React.useState<LookupItem | "new" | null>(null)
  const [toDelete, setToDelete] = React.useState<LookupItem | null>(null)
  const [name, setName] = React.useState("")
  const [extra, setExtra] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)

  function openEditor(item: LookupItem | "new") {
    setEditing(item)
    setName(item === "new" ? "" : item.name)
    setExtra(item === "new" ? "" : (item.extra ?? ""))
    setError(null)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError("Name is required")
      return
    }
    setSaving(true)
    const res = await saveLookup(kind, editing === "new" ? null : editing!.id, { name: name.trim(), extra: extra.trim() })
    setSaving(false)
    if (!res.ok) {
      setError(res.fieldErrors?.name?.[0] ?? res.error)
      return
    }
    toast.success(res.message)
    setEditing(null)
    router.refresh()
  }

  async function toggleActive(item: LookupItem, active: boolean) {
    const res = await setCaseTypeActive(item.id, active)
    if (!res.ok) toast.error(res.error)
    else router.refresh()
  }

  return (
    <div className="grid gap-3">
      {items.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">No {noun.toLowerCase()}s yet.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.name}</p>
                {(item.extra || item.usage !== undefined) && (
                  <p className="truncate text-xs text-muted-foreground">
                    {[item.extra, item.usage !== undefined ? `${item.usage} case${item.usage === 1 ? "" : "s"}` : null].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
              {item.is_active !== undefined && (
                <Switch
                  checked={item.is_active}
                  disabled={!editable}
                  onCheckedChange={(v) => toggleActive(item, v)}
                  aria-label={`${item.name} active`}
                />
              )}
              {editable && (
                <div className="flex">
                  <Button variant="ghost" size="icon-sm" onClick={() => openEditor(item)} aria-label={`Edit ${item.name}`}>
                    <PencilIcon />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => setToDelete(item)} aria-label={`Delete ${item.name}`}>
                    <Trash2Icon />
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {editable && (
        <div>
          <Button variant="outline" size="sm" onClick={() => openEditor("new")}>
            <PlusIcon /> Add {noun.toLowerCase()}
          </Button>
        </div>
      )}

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing === "new" ? `Add ${noun.toLowerCase()}` : `Edit ${noun.toLowerCase()}`}</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="grid gap-4" noValidate>
            <FormField label="Name" htmlFor={`${kind}-name`} error={error ?? undefined} required>
              <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus maxLength={120} />
            </FormField>
            {extraLabel && (
              <FormField label={extraLabel} htmlFor={`${kind}-extra`}>
                <Input value={extra} onChange={(e) => setExtra(e.target.value)} maxLength={300} />
              </FormField>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2Icon className="animate-spin" />} Save
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Delete ${toDelete?.name}?`}
        description="This action cannot be undone. Items that are in use cannot be deleted."
        onConfirm={async () => {
          const res = await deleteLookup(kind, toDelete!.id)
          if (!res.ok) {
            toast.error(res.error)
            return false
          }
          toast.success("Deleted.")
          router.refresh()
        }}
      />
    </div>
  )
}
