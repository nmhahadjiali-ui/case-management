"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2Icon, MailIcon, PhoneIcon, PlusIcon, UserMinusIcon, UsersIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { NativeSelect } from "@/components/shared/native-select"
import { PersonPicker } from "@/components/shared/person-picker"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { EmptyState } from "@/components/shared/empty-state"
import { UserAvatar } from "@/components/shared/user-avatar"
import { addCaseParty, removeCaseParty } from "@/lib/actions/cases"
import { PARTY_ROLES, type PartyRole } from "@/lib/constants"
import type { CaseParty, PersonOption } from "@/lib/types"

export function PartiesPanel({
  caseId,
  parties,
  people,
  canEdit,
}: {
  caseId: string
  parties: CaseParty[]
  people: PersonOption[]
  canEdit: boolean
}) {
  const router = useRouter()
  const [options, setOptions] = React.useState(people)
  const [personId, setPersonId] = React.useState("")
  const [role, setRole] = React.useState<PartyRole>("witness")
  const [adding, setAdding] = React.useState(false)
  const [toRemove, setToRemove] = React.useState<CaseParty | null>(null)

  async function add() {
    if (!personId) {
      toast.error("Choose a person.")
      return
    }
    setAdding(true)
    const res = await addCaseParty(caseId, personId, role)
    setAdding(false)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    toast.success("Party added.")
    setPersonId("")
    router.refresh()
  }

  const groups = PARTY_ROLES.map((r) => ({ ...r, items: parties.filter((p) => p.role === r.value) })).filter((g) => g.items.length)

  return (
    <div className="grid gap-6">
      {canEdit && (
        <div className="grid gap-2 rounded-lg border border-dashed p-3 sm:grid-cols-[1fr_180px_auto] sm:items-center">
          <PersonPicker options={options} value={personId} defaultRole={role} onChange={(p) => setPersonId(p.id)} onCreated={(p) => setOptions((o) => [...o, p])} />
          <NativeSelect value={role} onChange={(e) => setRole(e.target.value as PartyRole)} aria-label="Role in case">
            {PARTY_ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </NativeSelect>
          <Button onClick={add} disabled={adding}>
            {adding ? <Loader2Icon className="animate-spin" aria-hidden /> : <PlusIcon aria-hidden />} Add party
          </Button>
        </div>
      )}

      {groups.length === 0 ? (
        <EmptyState icon={UsersIcon} title="No parties yet" description="Add complainants, defendants, witnesses and representatives." />
      ) : (
        groups.map((g) => (
          <section key={g.value} className="grid gap-2">
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {g.label}s <span className="font-normal">({g.items.length})</span>
            </h3>
            <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {g.items.map((p) => (
                <li key={p.id} className="flex items-start gap-3 rounded-lg border p-3">
                  <UserAvatar name={p.person.full_name} />
                  <div className="min-w-0 flex-1">
                    <Link href={`/people/${p.person.id}`} className="block truncate text-sm font-medium hover:underline">
                      {p.person.full_name}
                    </Link>
                    {p.person.contact_number && (
                      <p className="flex items-center gap-1 text-xs text-muted-foreground"><PhoneIcon className="size-3" aria-hidden /> {p.person.contact_number}</p>
                    )}
                    {p.person.email && (
                      <p className="flex items-center gap-1 truncate text-xs text-muted-foreground"><MailIcon className="size-3" aria-hidden /> {p.person.email}</p>
                    )}
                  </div>
                  {canEdit && (
                    <Button variant="ghost" size="icon-sm" onClick={() => setToRemove(p)} aria-label={`Remove ${p.person.full_name}`}>
                      <UserMinusIcon />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      <ConfirmDialog
        open={toRemove !== null}
        onOpenChange={(o) => !o && setToRemove(null)}
        title="Remove party from case?"
        description={`${toRemove?.person.full_name} will be removed from this case. The person record itself is kept.`}
        confirmLabel="Remove"
        onConfirm={async () => {
          const res = await removeCaseParty(toRemove!.id, caseId)
          if (!res.ok) {
            toast.error(res.error)
            return false
          }
          toast.success("Party removed.")
          router.refresh()
        }}
      />
    </div>
  )
}
