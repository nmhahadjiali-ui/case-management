"use client"

import * as React from "react"
import { CheckIcon, ChevronsUpDownIcon, SearchIcon, UserPlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { PersonForm } from "@/components/people/person-form"
import { PARTY_ROLES, labelOf, type PartyRole } from "@/lib/constants"
import { cn } from "@/lib/utils"
import type { PersonOption } from "@/lib/types"

type PersonPickerProps = {
  options: PersonOption[]
  value: string
  onChange: (person: PersonOption) => void
  /** Called when a new person is created inline, so the parent can add it to its options. */
  onCreated?: (person: PersonOption) => void
  allowCreate?: boolean
  defaultRole?: PartyRole
  placeholder?: string
  id?: string
  invalid?: boolean
  exclude?: string[]
}

/** Searchable person selector with an option to create a new person inline. */
export function PersonPicker({
  options,
  value,
  onChange,
  onCreated,
  allowCreate = true,
  defaultRole,
  placeholder = "Select a person…",
  id,
  invalid,
  exclude = [],
}: PersonPickerProps) {
  const [open, setOpen] = React.useState(false)
  const [creating, setCreating] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const selected = options.find((o) => o.id === value)

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return options
      .filter((o) => o.id === value || !exclude.includes(o.id))
      .filter((o) => !q || o.full_name.toLowerCase().includes(q))
      .slice(0, 50)
  }, [options, query, exclude, value])

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              id={id}
              type="button"
              variant="outline"
              aria-invalid={invalid || undefined}
              className="w-full justify-between font-normal"
            />
          }
        >
          <span className={cn("truncate", !selected && "text-muted-foreground")}>
            {selected ? selected.full_name : placeholder}
          </span>
          <ChevronsUpDownIcon className="text-muted-foreground" aria-hidden />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-(--anchor-width) min-w-64 gap-0 p-0">
          <div className="flex items-center gap-2 border-b px-3">
            <SearchIcon className="size-4 text-muted-foreground" aria-hidden />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search people…"
              aria-label="Search people"
              className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <ul role="listbox" aria-label="People" className="max-h-64 overflow-y-auto p-1">
            {filtered.length === 0 && <li className="px-2 py-6 text-center text-sm text-muted-foreground">No people found.</li>}
            {filtered.map((o) => (
              <li key={o.id} role="option" aria-selected={o.id === value}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(o)
                    setOpen(false)
                    setQuery("")
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none hover:bg-accent focus-visible:bg-accent"
                >
                  <CheckIcon className={cn("size-4", o.id === value ? "opacity-100" : "opacity-0")} aria-hidden />
                  <span className="flex-1 truncate">{o.full_name}</span>
                  <span className="text-xs text-muted-foreground">{labelOf(PARTY_ROLES, o.primary_role)}</span>
                </button>
              </li>
            ))}
          </ul>
          {allowCreate && (
            <div className="border-t p-1">
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  setCreating(true)
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-primary outline-none hover:bg-accent focus-visible:bg-accent"
              >
                <UserPlusIcon className="size-4" aria-hidden /> Create new person
              </button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>New person</DialogTitle>
            <DialogDescription>The person will be saved and selected.</DialogDescription>
          </DialogHeader>
          <PersonForm
            mode="dialog"
            defaultRole={defaultRole}
            onCancel={() => setCreating(false)}
            onSaved={(p) => {
              onCreated?.(p)
              onChange(p)
              setCreating(false)
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
