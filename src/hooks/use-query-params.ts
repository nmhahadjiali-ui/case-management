"use client"

import { useCallback, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

/**
 * Read and update URL query parameters, so filters are shareable and survive
 * reloads. Setting a value to "" removes it. Changing any filter resets `page`.
 */
export function useQueryParams() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const setParams = useCallback(
    (updates: Record<string, string | null | undefined>, opts: { resetPage?: boolean } = {}) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === undefined || value === "") params.delete(key)
        else params.set(key, value)
      }
      if (opts.resetPage !== false && !("page" in updates)) params.delete("page")
      const qs = params.toString()
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
      })
    },
    [pathname, router, searchParams]
  )

  return { searchParams, setParams, isPending }
}
