import type { Metadata } from "next"
import { SettingsSection } from "@/components/settings/settings-section"
import { UsersManager } from "@/components/settings/users-manager"
import { requireRole } from "@/lib/auth"
import { getLookups } from "@/lib/data/lookups"
import { createClient } from "@/lib/supabase/server"
import type { Profile } from "@/lib/types"

export const metadata: Metadata = { title: "Users & Roles" }

const PERMISSIONS: [string, string, string, string, string][] = [
  ["View cases, people, calendar and tasks", "✓", "✓", "✓", "✓"],
  ["Create and edit records", "✓", "✓", "✓", "—"],
  ["Edit cases", "All", "All", "Assigned / own", "—"],
  ["Delete cases and people", "✓", "✓", "—", "—"],
  ["Delete events, tasks, notes, documents", "All", "All", "Own", "—"],
  ["Manage case types, departments, locations", "✓", "—", "—", "—"],
  ["Manage users, view audit logs and system info", "✓", "—", "—", "—"],
]

export default async function UsersPage() {
  const session = await requireRole("administrator")
  const supabase = await createClient()
  const [{ data }, lookups] = await Promise.all([
    supabase.from("profiles").select("*").order("is_active", { ascending: false }).order("full_name"),
    getLookups(),
  ])

  return (
    <>
      <SettingsSection title="Users" description="Create accounts, assign roles and activate or deactivate users.">
        <UsersManager users={(data ?? []) as Profile[]} departments={lookups.departments} currentUserId={session.userId} />
      </SettingsSection>
      <SettingsSection title="Roles & permissions" description="Enforced in the database by Row Level Security.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th scope="col" className="py-2 pr-4 font-medium">Permission</th>
                <th scope="col" className="py-2 font-medium">Administrator</th>
                <th scope="col" className="py-2 font-medium">Case Manager</th>
                <th scope="col" className="py-2 font-medium">Staff</th>
                <th scope="col" className="py-2 font-medium">Viewer</th>
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS.map(([label, ...cells]) => (
                <tr key={label} className="border-b last:border-0">
                  <th scope="row" className="py-2 pr-4 text-left font-normal">{label}</th>
                  {cells.map((c, i) => <td key={i} className="py-2 text-muted-foreground">{c}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SettingsSection>
    </>
  )
}
