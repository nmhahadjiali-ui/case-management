"use client"

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { NativeSelect } from "@/components/shared/native-select"
import { useQueryParams } from "@/hooks/use-query-params"
import { PAGE_SIZES } from "@/lib/constants"

export function Pagination({
  page,
  perPage,
  total,
  showPageSize = true,
}: {
  page: number
  perPage: number
  total: number
  showPageSize?: boolean
}) {
  const { setParams, isPending } = useQueryParams()
  const pages = Math.max(1, Math.ceil(total / perPage))
  const from = total === 0 ? 0 : (page - 1) * perPage + 1
  const to = Math.min(total, page * perPage)

  return (
    <div className="flex flex-col-reverse items-center justify-between gap-3 text-sm text-muted-foreground sm:flex-row">
      <p aria-live="polite">
        {total === 0 ? "No results" : `Showing ${from}–${to} of ${total}`}
      </p>
      <div className="flex items-center gap-3">
        {showPageSize && (
          <label className="flex items-center gap-2">
            <span className="hidden sm:inline">Rows per page</span>
            <NativeSelect
              value={String(perPage)}
              onChange={(e) => setParams({ per: e.target.value })}
              className="w-20"
              aria-label="Rows per page"
            >
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </NativeSelect>
          </label>
        )}
        <span className="tabular-nums">
          Page {Math.min(page, pages)} of {pages}
        </span>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            disabled={page <= 1 || isPending}
            onClick={() => setParams({ page: String(page - 1) })}
            aria-label="Previous page"
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            disabled={page >= pages || isPending}
            onClick={() => setParams({ page: String(page + 1) })}
            aria-label="Next page"
          >
            <ChevronRightIcon />
          </Button>
        </div>
      </div>
    </div>
  )
}
