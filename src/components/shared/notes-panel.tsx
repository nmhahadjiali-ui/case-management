"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader2Icon, MessageSquareIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { EmptyState } from "@/components/shared/empty-state"
import { UserAvatar } from "@/components/shared/user-avatar"
import { formatDateTime, formatRelative } from "@/lib/datetime"
import type { ActionResult } from "@/lib/action-result"
import type { Note } from "@/lib/types"

/** Note list + composer, used for both cases and people. */
export function NotesPanel({
  notes,
  canAdd,
  canDelete,
  onAdd,
  onDelete,
}: {
  notes: Note[]
  canAdd: boolean
  canDelete: (note: Note) => boolean
  onAdd: (body: string) => Promise<ActionResult>
  onDelete: (noteId: string) => Promise<ActionResult>
}) {
  const router = useRouter()
  const [body, setBody] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [toDelete, setToDelete] = React.useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim()) {
      setError("Write a note first.")
      return
    }
    setSaving(true)
    setError(null)
    const res = await onAdd(body.trim())
    setSaving(false)
    if (!res.ok) {
      setError(res.fieldErrors?.body?.[0] ?? res.error)
      return
    }
    setBody("")
    toast.success("Note added.")
    router.refresh()
  }

  return (
    <div className="grid gap-4">
      {canAdd && (
        <form onSubmit={submit} className="grid gap-2" noValidate>
          <label htmlFor="new-note" className="sr-only">New note</label>
          <Textarea
            id="new-note"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            maxLength={5000}
            placeholder="Add a note…"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "new-note-error" : undefined}
          />
          {error && <p id="new-note-error" role="alert" className="text-xs font-medium text-destructive">{error}</p>}
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={saving}>
              {saving && <Loader2Icon className="animate-spin" aria-hidden />} Add note
            </Button>
          </div>
        </form>
      )}

      {notes.length === 0 ? (
        <EmptyState icon={MessageSquareIcon} title="No notes yet" description={canAdd ? "Add the first note above." : undefined} />
      ) : (
        <ul className="grid gap-3">
          {notes.map((n) => (
            <li key={n.id} className="flex gap-3 rounded-lg border bg-card p-3">
              <UserAvatar name={n.author?.full_name} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{n.author?.full_name ?? "Unknown"}</span> ·{" "}
                  <time suppressHydrationWarning dateTime={n.created_at} title={formatDateTime(n.created_at)}>{formatRelative(n.created_at)}</time>
                </p>
                <p className="mt-1 text-sm whitespace-pre-wrap">{n.body}</p>
              </div>
              {canDelete(n) && (
                <Button variant="ghost" size="icon-sm" onClick={() => setToDelete(n.id)} aria-label="Delete note">
                  <Trash2Icon />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete note?"
        onConfirm={async () => {
          const res = await onDelete(toDelete!)
          if (!res.ok) {
            toast.error(res.error)
            return false
          }
          toast.success("Note deleted.")
          router.refresh()
        }}
      />
    </div>
  )
}
