import { PageHeader } from "@/components/shared/page-header"
import { SettingsNav } from "@/components/settings/settings-nav"
import { requireSession } from "@/lib/auth"
import { isAdmin } from "@/lib/permissions"

export default async function SettingsLayout({ children }: LayoutProps<"/settings">) {
  const { profile } = await requireSession()
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage your account, preferences and system configuration." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="min-w-0">
          <SettingsNav isAdmin={isAdmin(profile.role)} />
        </aside>
        <div className="min-w-0 space-y-6">{children}</div>
      </div>
    </div>
  )
}
