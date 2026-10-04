import type { Metadata } from "next"
import { SettingsSection } from "@/components/settings/settings-section"
import { LookupManager } from "@/components/settings/lookup-manager"
import { CasePriorityBadge, CaseStatusBadge } from "@/components/shared/badges"
import { requireSession } from "@/lib/auth"
import { getAllCaseTypes, getLookups, getTags } from "@/lib/data/lookups"
import { createClient } from "@/lib/supabase/server"
import { CASE_PRIORITIES, CASE_STATUSES } from "@/lib/constants"
import { isAdmin } from "@/lib/permissions"

export const metadata: Metadata = { title: "Case management settings" }

export default async function CaseSettingsPage() {
  const { profile } = await requireSession()
  const supabase = await createClient()
  const [types, lookups, tags, byType] = await Promise.all([
    getAllCaseTypes(),
    getLookups(),
    getTags(),
    supabase.rpc("get_cases_by_type"),
  ])
  const usage = new Map(((byType.data ?? []) as { slug: string; total: number }[]).map((r) => [r.slug, Number(r.total)]))
  const admin = isAdmin(profile.role)
  const note = admin ? undefined : "Only administrators can change these lists."

  return (
    <>
      <SettingsSection title="Case types" description={note ?? "Inactive types are hidden from new cases but kept on existing ones."}>
        <LookupManager
          kind="case_types"
          noun="Case type"
          editable={admin}
          extraLabel="Description"
          items={types.map((t) => ({ id: t.id, name: t.name, extra: t.description, is_active: t.is_active, usage: usage.get(t.slug) }))}
        />
      </SettingsSection>

      <div className="grid gap-6 xl:grid-cols-2">
        <SettingsSection title="Case statuses" description="Fixed by the system workflow.">
          <ul className="flex flex-wrap gap-2">
            {CASE_STATUSES.map((s) => <li key={s.value}><CaseStatusBadge status={s.value} /></li>)}
          </ul>
        </SettingsSection>
        <SettingsSection title="Priority levels" description="Fixed by the system workflow.">
          <ul className="flex flex-wrap gap-2">
            {CASE_PRIORITIES.map((p) => <li key={p.value}><CasePriorityBadge priority={p.value} /></li>)}
          </ul>
        </SettingsSection>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SettingsSection title="Departments / Offices" description={note}>
          <LookupManager kind="departments" noun="Department" editable={admin} items={lookups.departments.map((d) => ({ id: d.id, name: d.name }))} />
        </SettingsSection>
        <SettingsSection title="Locations" description={note ?? "Courts, offices and rooms."}>
          <LookupManager
            kind="locations"
            noun="Location"
            editable={admin}
            extraLabel="Address"
            items={lookups.locations.map((l) => ({ id: l.id, name: l.name, extra: l.address }))}
          />
        </SettingsSection>
      </div>

      <SettingsSection title="Tags" description={note ?? "Tags are also created automatically when entered on a case."}>
        <LookupManager kind="tags" noun="Tag" editable={admin} items={tags.map((t) => ({ id: t.id, name: t.name }))} />
      </SettingsSection>
    </>
  )
}
