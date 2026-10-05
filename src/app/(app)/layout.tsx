import { cookies } from "next/headers"
import { AppShell } from "@/components/layout/app-shell"
import { requireSession } from "@/lib/auth"
import { getRecentNotifications } from "@/lib/data/notifications"
import { getBranding } from "@/lib/data/branding"
import { greetingFor } from "@/lib/datetime"

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { profile } = await requireSession()
  const [cookieStore, notifications, branding] = await Promise.all([cookies(), getRecentNotifications(), getBranding()])

  return (
    <AppShell
      profile={profile}
      appLogoUrl={branding.appLogoUrl}
      initialCollapsed={cookieStore.get("sidebar_collapsed")?.value === "1"}
      initialGreeting={greetingFor()}
      notifications={notifications.items}
      unread={notifications.unread}
    >
      {children}
    </AppShell>
  )
}
