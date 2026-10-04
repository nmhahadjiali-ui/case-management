"use client"

import * as React from "react"
import { LaptopIcon, Loader2Icon, LogOutIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { signOutEverywhere, signOutOtherSessions } from "@/lib/actions/auth"
import { formatDateTime } from "@/lib/datetime"
import { useMounted } from "@/hooks/use-mounted"

function describeBrowser(ua: string) {
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser"
  const os = /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "macOS" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Linux/.test(ua) ? "Linux" : ""
  return os ? `${browser} on ${os}` : browser
}

export function SessionsCard({ tokenIssuedAt }: { tokenIssuedAt: string | null }) {
  const mounted = useMounted()
  const device = mounted ? describeBrowser(navigator.userAgent) : "This device"
  const [busy, setBusy] = React.useState(false)
  const [confirm, setConfirm] = React.useState(false)

  async function others() {
    setBusy(true)
    const res = await signOutOtherSessions()
    setBusy(false)
    if (res.ok) toast.success(res.message)
    else toast.error(res.error)
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-3 rounded-lg border p-3">
        <LaptopIcon className="size-5 text-muted-foreground" aria-hidden />
        <div className="flex-1 text-sm">
          <p className="font-medium">{device} <span className="ml-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-700 dark:text-emerald-300">Current session</span></p>
          {tokenIssuedAt && <p className="text-xs text-muted-foreground">Session refreshed {formatDateTime(tokenIssuedAt)}</p>}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={others} disabled={busy}>
          {busy ? <Loader2Icon className="animate-spin" /> : <LogOutIcon />} Sign out other sessions
        </Button>
        <Button variant="destructive" onClick={() => setConfirm(true)}>
          <LogOutIcon /> Sign out everywhere
        </Button>
      </div>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Sign out everywhere?"
        description="You will be signed out on all devices, including this one."
        confirmLabel="Sign out"
        onConfirm={() => signOutEverywhere()}
      />
    </div>
  )
}
