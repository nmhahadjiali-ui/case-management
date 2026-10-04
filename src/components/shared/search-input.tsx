"use client"

import * as React from "react"
import { Loader2Icon, SearchIcon, XIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useQueryParams } from "@/hooks/use-query-params"
import { cn } from "@/lib/utils"

/** Debounced search box bound to the `q` query parameter. */
export function SearchInput({
  placeholder = "Search…",
  param = "q",
  className,
}: {
  placeholder?: string
  param?: string
  className?: string
}) {
  const { searchParams, setParams, isPending } = useQueryParams()
  const urlValue = searchParams.get(param) ?? ""
  const [value, setValue] = React.useState(urlValue)
  const lastSent = React.useRef(urlValue)

  // Keep the box in sync when the URL changes elsewhere (e.g. "Clear filters").
  React.useEffect(() => {
    if (urlValue !== lastSent.current) {
      lastSent.current = urlValue
      setValue(urlValue)
    }
  }, [urlValue])

  React.useEffect(() => {
    if (value === lastSent.current) return
    const id = setTimeout(() => {
      lastSent.current = value
      setParams({ [param]: value.trim() })
    }, 300)
    return () => clearTimeout(id)
  }, [value, param, setParams])

  return (
    <div className={cn("relative w-full sm:max-w-xs", className)}>
      <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="pr-8 pl-8 [&::-webkit-search-cancel-button]:hidden"
      />
      {isPending ? (
        <Loader2Icon className="absolute top-1/2 right-2.5 size-4 -translate-y-1/2 animate-spin text-muted-foreground" aria-hidden />
      ) : (
        value && (
          <button
            type="button"
            onClick={() => setValue("")}
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <XIcon className="size-3.5" />
          </button>
        )
      )}
    </div>
  )
}
