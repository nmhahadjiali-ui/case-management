"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { CheckIcon, ClockIcon, Loader2Icon, MailIcon, XIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { FormField } from "@/components/shared/form-field"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { EmptyState } from "@/components/shared/empty-state"
import { Pill } from "@/components/shared/badges"
import { UserAvatar } from "@/components/shared/user-avatar"
import { cancelEmailChangeRequest, requestEmailChange, reviewEmailChangeRequest } from "@/lib/actions/email-requests"
import { emailChangeRequestSchema, type EmailChangeRequestInput } from "@/lib/validations/settings"
import { formatDate, formatDateTime, formatRelative } from "@/lib/datetime"
import { useMounted } from "@/hooks/use-mounted"
import type { EmailChangeRequest } from "@/lib/types"

const STATUS_TONE: Record<EmailChangeRequest["status"], string> = {
  pending: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  approved: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  rejected: "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300",
  cancelled: "border-border bg-muted text-muted-foreground",
}

/** Relative time ("5 minutes ago") rendered only in the browser, so it cannot cause a hydration mismatch. */
function RelativeTime({ value }: { value: string }) {
  const mounted = useMounted()
  return <time dateTime={value}>{mounted ? formatRelative(value) : formatDateTime(value)}</time>
}

function StatusPill({ status }: { status: EmailChangeRequest["status"] }) {
  return <Pill className={STATUS_TONE[status]}>{status[0].toUpperCase() + status.slice(1)}</Pill>
}

/* -------------------------------------------------------------------------- */
/* Requester side (Settings → Account, non-administrators)                     */
/* -------------------------------------------------------------------------- */

export function EmailChangePanel({ email, latest }: { email: string; latest: EmailChangeRequest | null }) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [cancelling, setCancelling] = React.useState(false)
  const pending = latest?.status === "pending" ? latest : null

  async function cancel() {
    setCancelling(true)
    const res = await cancelEmailChangeRequest(pending!.id)
    setCancelling(false)
    if (!res.ok) toast.error(res.error)
    else {
      toast.success(res.message)
      router.refresh()
    }
  }

  return (
    <div className="grid max-w-xl gap-4">
      <FormField label="Current email" htmlFor="current_email" description="Changing your sign-in email requires an administrator's approval.">
        <Input id="current_email" type="email" value={email} readOnly disabled />
      </FormField>

      {pending ? (
        <div className="flex flex-wrap items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
          <ClockIcon className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="font-medium">Waiting for approval</p>
            <p className="text-muted-foreground">
              Change to <span className="font-medium text-foreground">{pending.new_email}</span> · requested <RelativeTime value={pending.created_at} />
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={cancel} disabled={cancelling}>
            {cancelling && <Loader2Icon className="animate-spin" />} Cancel request
          </Button>
        </div>
      ) : (
        <div className="grid gap-2">
          {latest && latest.status !== "cancelled" && (
            <p className="text-xs text-muted-foreground">
              Your last request (to {latest.new_email}) was <span className="font-medium">{latest.status}</span>
              {latest.reviewed_at && ` on ${formatDate(latest.reviewed_at)}`}
              {latest.review_note && `: “${latest.review_note}”`}
            </p>
          )}
          <div>
            <Button variant="outline" onClick={() => setOpen(true)}>
              <MailIcon /> Request email change
            </Button>
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request email change</DialogTitle>
            <DialogDescription>An administrator will review your request. You will be notified once it is approved or rejected.</DialogDescription>
          </DialogHeader>
          <RequestForm onDone={() => { setOpen(false); router.refresh() }} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function RequestForm({ onDone }: { onDone: () => void }) {
  const form = useForm<EmailChangeRequestInput>({
    resolver: zodResolver(emailChangeRequestSchema),
    defaultValues: { new_email: "", reason: "" },
  })
  const { errors, isSubmitting } = form.formState

  async function onSubmit(values: EmailChangeRequestInput) {
    const res = await requestEmailChange(values)
    if (!res.ok) {
      for (const [field, msgs] of Object.entries(res.fieldErrors ?? {})) form.setError(field as keyof EmailChangeRequestInput, { message: msgs[0] })
      toast.error(res.error)
      return
    }
    toast.success(res.message)
    onDone()
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4" noValidate>
      <FormField label="New email" htmlFor="new_email" error={errors.new_email?.message} required>
        <Input id="new_email" type="email" autoComplete="email" {...form.register("new_email")} />
      </FormField>
      <FormField label="Reason" htmlFor="reason" error={errors.reason?.message} description="Optional, helps the administrator decide.">
        <Textarea id="reason" rows={3} {...form.register("reason")} />
      </FormField>
      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2Icon className="animate-spin" />} Send request
        </Button>
      </div>
    </form>
  )
}

/* -------------------------------------------------------------------------- */
/* Administrator side (Settings → Users & Roles)                               */
/* -------------------------------------------------------------------------- */

export function EmailRequestsManager({ pending, recent }: { pending: EmailChangeRequest[]; recent: EmailChangeRequest[] }) {
  const router = useRouter()
  const [approving, setApproving] = React.useState<EmailChangeRequest | null>(null)
  const [rejecting, setRejecting] = React.useState<EmailChangeRequest | null>(null)
  const [note, setNote] = React.useState("")
  const [busy, setBusy] = React.useState(false)

  async function review(r: EmailChangeRequest, approve: boolean, reviewNote = "") {
    const res = await reviewEmailChangeRequest(r.id, approve, reviewNote)
    if (!res.ok) {
      toast.error(res.error)
      return false
    }
    toast.success(res.message)
    router.refresh()
  }

  async function submitReject() {
    setBusy(true)
    const ok = await review(rejecting!, false, note)
    setBusy(false)
    if (ok !== false) {
      setRejecting(null)
      setNote("")
    }
  }

  return (
    <div className="grid gap-6">
      {pending.length === 0 ? (
        <EmptyState icon={MailIcon} title="No pending requests" description="Requests from users who want to change their sign-in email appear here." className="py-8" />
      ) : (
        <ul className="divide-y rounded-lg border">
          {pending.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 p-3">
              <UserAvatar name={r.user?.full_name ?? "?"} src={r.user?.avatar_url} size="sm" />
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-medium">{r.user?.full_name ?? "Unknown user"} <span className="text-xs font-normal text-muted-foreground">· <RelativeTime value={r.created_at} /></span></p>
                <p className="truncate text-muted-foreground">
                  {r.current_email} → <span className="font-medium text-foreground">{r.new_email}</span>
                </p>
                {r.reason && <p className="mt-0.5 text-xs text-muted-foreground">“{r.reason}”</p>}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setRejecting(r)}>
                  <XIcon /> Reject
                </Button>
                <Button size="sm" onClick={() => setApproving(r)}>
                  <CheckIcon /> Approve
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {recent.length > 0 && (
        <div className="grid gap-2">
          <h3 className="text-sm font-semibold">Recent decisions</h3>
          <ul className="divide-y rounded-lg border text-sm">
            {recent.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate">
                    <span className="font-medium">{r.user?.full_name ?? "Unknown user"}</span>
                    <span className="text-muted-foreground"> · {r.current_email} → {r.new_email}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.reviewed_at ? formatDate(r.reviewed_at) : formatDate(r.created_at)}
                    {r.reviewer?.full_name && ` by ${r.reviewer.full_name}`}
                    {r.review_note && ` · “${r.review_note}”`}
                  </p>
                </div>
                <StatusPill status={r.status} />
              </li>
            ))}
          </ul>
        </div>
      )}

      <ConfirmDialog
        open={approving !== null}
        onOpenChange={(o) => !o && setApproving(null)}
        title={`Approve email change for ${approving?.user?.full_name ?? "this user"}?`}
        description={`Their sign-in email will change to ${approving?.new_email} immediately. They must use the new email the next time they sign in.`}
        confirmLabel="Approve"
        destructive={false}
        onConfirm={() => review(approving!, true)}
      />

      <Dialog open={rejecting !== null} onOpenChange={(o) => { if (!o) { setRejecting(null); setNote("") } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject email change</DialogTitle>
            <DialogDescription>
              {rejecting?.user?.full_name} asked to change to {rejecting?.new_email}. They will be notified.
            </DialogDescription>
          </DialogHeader>
          <FormField label="Note to the user" htmlFor="review_note" description="Optional.">
            <Textarea id="review_note" rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
          </FormField>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setRejecting(null); setNote("") }}>Cancel</Button>
            <Button variant="destructive" onClick={submitReject} disabled={busy}>
              {busy && <Loader2Icon className="animate-spin" />} Reject request
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
