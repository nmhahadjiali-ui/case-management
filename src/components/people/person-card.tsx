import Link from "next/link"
import { BriefcaseIcon, MailIcon, MapPinIcon, PhoneIcon } from "lucide-react"
import { PartyRoleBadge, Pill } from "@/components/shared/badges"
import { UserAvatar } from "@/components/shared/user-avatar"
import type { PersonListItem } from "@/lib/types"

export function PersonCard({ person }: { person: PersonListItem }) {
  const roles = person.case_roles.length ? person.case_roles : [person.primary_role]
  return (
    <Link
      href={`/people/${person.id}`}
      className="group flex h-full flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 transition-shadow outline-none hover:shadow-md hover:ring-foreground/20 focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <div className="flex items-start gap-3">
        <UserAvatar name={person.full_name} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium group-hover:text-primary">{person.full_name}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {roles.slice(0, 3).map((r) => (
              <PartyRoleBadge key={r} role={r} />
            ))}
          </div>
        </div>
        <Pill
          className={
            person.is_active
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "border-border bg-muted text-muted-foreground"
          }
        >
          {person.is_active ? "Active" : "Inactive"}
        </Pill>
      </div>

      <dl className="grid gap-1.5 text-sm text-muted-foreground">
        <div className="flex items-start gap-2">
          <dt className="sr-only">Address</dt>
          <MapPinIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <dd className="line-clamp-2">{person.address || "No address"}</dd>
        </div>
        <div className="flex items-center gap-2">
          <dt className="sr-only">Contact number</dt>
          <PhoneIcon className="size-3.5 shrink-0" aria-hidden />
          <dd className="truncate">{person.contact_number || "—"}</dd>
        </div>
        <div className="flex items-center gap-2">
          <dt className="sr-only">Email</dt>
          <MailIcon className="size-3.5 shrink-0" aria-hidden />
          <dd className="truncate">{person.email || "—"}</dd>
        </div>
      </dl>

      <div className="mt-auto flex items-center justify-between gap-2 border-t pt-3 text-xs">
        <span className="truncate text-muted-foreground" title={person.case_types.join(", ")}>
          {person.case_types.length ? person.case_types.join(", ") : "No case types"}
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 font-medium">
          <BriefcaseIcon className="size-3.5" aria-hidden /> {person.case_count} case{person.case_count === 1 ? "" : "s"}
        </span>
      </div>
    </Link>
  )
}
