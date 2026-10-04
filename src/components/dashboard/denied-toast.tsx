"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { toast } from "sonner"

/** Shows one-off messages passed via query string (e.g. after a role-guard redirect). */
export function DeniedToast({ denied, passwordUpdated }: { denied?: boolean; passwordUpdated?: boolean }) {
  const router = useRouter()
  const pathname = usePathname()
  useEffect(() => {
    if (!denied && !passwordUpdated) return
    if (denied) toast.error("You do not have permission to view that page.")
    if (passwordUpdated) toast.success("Your password has been updated.")
    router.replace(pathname)
  }, [denied, passwordUpdated, pathname, router])
  return null
}
