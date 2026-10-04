import type { Metadata } from "next"
import { cookies } from "next/headers"
import { SettingsSection } from "@/components/settings/settings-section"
import { AppearanceForm } from "@/components/settings/preference-forms"
import { requireSession } from "@/lib/auth"

export const metadata: Metadata = { title: "Appearance" }

export default async function AppearancePage() {
  await requireSession()
  const store = await cookies()
  return (
    <SettingsSection title="Appearance" description="Theme and layout preferences for this device.">
      <AppearanceForm sidebarCollapsed={store.get("sidebar_collapsed")?.value === "1"} />
    </SettingsSection>
  )
}
