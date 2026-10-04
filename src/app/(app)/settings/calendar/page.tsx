import type { Metadata } from "next"
import { SettingsSection } from "@/components/settings/settings-section"
import { CalendarPrefsForm } from "@/components/settings/preference-forms"
import { requireSession } from "@/lib/auth"
import { getUserSettings } from "@/lib/data/lookups"
import { APP_TIMEZONE } from "@/lib/datetime"

export const metadata: Metadata = { title: "Calendar settings" }

export default async function CalendarSettingsPage() {
  const { userId } = await requireSession()
  const settings = await getUserSettings(userId)
  return (
    <SettingsSection title="Calendar" description="Default view, working hours and reminders.">
      <CalendarPrefsForm settings={settings} timezone={APP_TIMEZONE} />
    </SettingsSection>
  )
}
