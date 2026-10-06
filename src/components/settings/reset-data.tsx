"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader2Icon, Trash2Icon, TriangleAlertIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { FormField } from "@/components/shared/form-field"
import { resetAllData } from "@/lib/actions/system"

const ALWAYS_DELETED = [
  "Cases, parties, tags and case notes",
  "People and their notes",
  "Hearings and calendar events",
  "Tasks",
  "Documents and their uploaded files",
  "Notifications, audit log and email change requests",
]

function Option({
  id,
  checked,
  onChange,
  title,
  description,
}: {
  id: string
  checked: boolean
  onChange: (v: boolean) => void
  title: string
  description: string
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3 rounded-lg border bg-card p-3">
      <Checkbox id={id} checked={checked} onCheckedChange={(v) => onChange(Boolean(v))} className="mt-0.5" />
      <span className="grid gap-0.5">
        <span className="text-sm font-medium">{title}</span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </span>
    </label>
  )
}

/** Settings → System → Danger zone. Wipes all data after re-entering the admin password. */
export function ResetDataCard({ adminEmail }: { adminEmail: string }) {
  const router = useRouter()
  const [deleteUsers, setDeleteUsers] = React.useState(false)
  const [resetSettings, setResetSettings] = React.useState(false)
  const [open, setOpen] = React.useState(false)
  const [password, setPassword] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)

  function close() {
    setOpen(false)
    setPassword("")
    setError(null)
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const res = await resetAllData({ password, deleteUsers, resetSettings })
    setBusy(false)
    if (!res.ok) {
      setError(res.fieldErrors?.password?.[0] ?? res.error)
      toast.error(res.error)
      return
    }
    close()
    toast.success(res.message)
    router.push("/dashboard")
    router.refresh()
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-2 text-sm">
        <p>Permanently deletes all records, like formatting the system. This cannot be undone.</p>
        <ul className="grid gap-1 pl-5 text-muted-foreground sm:grid-cols-2">
          {ALWAYS_DELETED.map((item) => (
            <li key={item} className="list-disc">{item}</li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">
          Kept: your administrator account, case types, departments, locations and tags.
        </p>
      </div>

      <div className="grid gap-2">
        <Option
          id="reset-users"
          checked={deleteUsers}
          onChange={setDeleteUsers}
          title="Also delete all other user accounts"
          description={`Everyone except you (${adminEmail}) is removed, including their profile pictures.`}
        />
        <Option
          id="reset-settings"
          checked={resetSettings}
          onChange={setResetSettings}
          title="Also reset settings to defaults"
          description="The oath text and the app and splash logos go back to their defaults."
        />
      </div>

      <div>
        <Button variant="destructive" onClick={() => setOpen(true)}>
          <Trash2Icon /> Delete all data…
        </Button>
      </div>

      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <TriangleAlertIcon className="size-5" aria-hidden /> Delete all data?
            </DialogTitle>
            <DialogDescription>
              This permanently deletes all case data
              {deleteUsers && ", all other user accounts"}
              {resetSettings && " and resets the oath and logos"}. It cannot be undone. Enter your password to confirm.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={confirm} className="grid gap-4" noValidate>
            <FormField label="Administrator password" htmlFor="reset-password" error={error ?? undefined} required>
              <Input
                id="reset-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={Boolean(error)}
                autoFocus
              />
            </FormField>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={close} disabled={busy}>Cancel</Button>
              <Button type="submit" variant="destructive" disabled={busy || !password}>
                {busy && <Loader2Icon className="animate-spin" />} Delete everything
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
