"use client"

import * as React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Loader2Icon, RotateCcwIcon, UploadIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { BrandLogo } from "@/components/shared/brand-logo"
import { createClient } from "@/lib/supabase/client"
import { updateBrandingLogo, type BrandingLogoKind } from "@/lib/actions/settings"
import { APP_NAME, APP_TAGLINE } from "@/lib/constants"

const TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"]
const MAX_BYTES = 2 * 1024 * 1024

function Preview({ kind, url }: { kind: BrandingLogoKind; url: string | null }) {
  if (kind === "app") {
    return (
      <div className="flex flex-wrap items-center gap-6">
        <BrandLogo src={url} size="xl" />
        {/* How it looks in the sidebar */}
        <div className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2">
          <BrandLogo src={url} />
          <div className="leading-tight">
            <p className="text-sm font-semibold">{APP_NAME}</p>
            <p className="text-xs text-muted-foreground">{APP_TAGLINE}</p>
          </div>
        </div>
      </div>
    )
  }
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element -- remote, admin-uploaded image of unknown size
    <img src={url} alt="Splash screen logo" className="size-36 object-contain" />
  ) : (
    <Image src="/brand/court-seal.webp" alt="Default splash screen logo (court seal)" width={640} height={640} className="size-36" />
  )
}

export function LogoSetting({
  kind,
  url,
  defaultLabel,
}: {
  kind: BrandingLogoKind
  url: string | null
  defaultLabel: string
}) {
  const router = useRouter()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [busy, setBusy] = React.useState(false)
  const [confirmReset, setConfirmReset] = React.useState(false)

  async function save(newUrl: string | null) {
    const res = await updateBrandingLogo(kind, newUrl)
    if (!res.ok) {
      toast.error(res.error)
      return false
    }
    toast.success(res.message)
    router.refresh()
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    if (!TYPES.includes(file.type)) {
      toast.error("Choose a PNG, JPEG, WebP or GIF image.")
      return
    }
    if (file.size > MAX_BYTES) {
      toast.error("Logos must be 2 MB or smaller.")
      return
    }
    setBusy(true)
    const supabase = createClient()
    const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "png"
    const path = `${kind}/logo-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from("branding").upload(path, file, { contentType: file.type })
    if (error) {
      setBusy(false)
      console.error(error)
      toast.error("Could not upload the logo. Please try again.")
      return
    }
    await save(supabase.storage.from("branding").getPublicUrl(path).data.publicUrl)
    setBusy(false)
  }

  return (
    <div className="grid gap-5">
      <div className="flex min-h-36 items-center rounded-lg border border-dashed bg-card p-4">
        <Preview kind={kind} url={url} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input ref={inputRef} type="file" accept={TYPES.join(",")} className="sr-only" onChange={onFile} aria-label={`Upload ${kind} logo`} />
        <Button onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy ? <Loader2Icon className="animate-spin" /> : <UploadIcon />} Upload logo
        </Button>
        <Button variant="outline" onClick={() => setConfirmReset(true)} disabled={busy || !url}>
          <RotateCcwIcon /> Reset to default
        </Button>
        <span className="text-xs text-muted-foreground">
          {url ? "Using a custom logo." : `Using the default: ${defaultLabel}.`}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        PNG, JPEG, WebP or GIF, up to 2 MB. A square image with a transparent background looks best.
      </p>

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Reset to the default logo?"
        description={`The custom logo will be removed and the default (${defaultLabel}) will be used again.`}
        confirmLabel="Reset"
        destructive={false}
        onConfirm={() => save(null)}
      />
    </div>
  )
}
