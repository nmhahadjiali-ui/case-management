import { cookies } from "next/headers"
import { AppShell } from "@/components/layout/app-shell"
import { requireSession } from "@/lib/auth"
import { getRecentNotifications } from "@/lib/data/notifications"
import { greetingFor } from "@/lib/datetime"

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { profile } = await requireSession()
  const [cookieStore, notifications] = await Promise.all([cookies(), getRecentNotifications()])

  return (
    <AppShell
      profile={profile}
      initialCollapsed={cookieStore.get("sidebar_collapsed")?.value === "1"}
      initialGreeting={greetingFor()}
      notifications={notifications.items}
      unread={notifications.unread}
    >
      {children}
    </AppShell>
  )
}
