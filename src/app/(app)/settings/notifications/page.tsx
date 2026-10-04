import type { Metadata } from "next"
import { SettingsSection } from "@/components/settings/settings-section"
import { NotificationPrefsForm } from "@/components/settings/preference-forms"
import { requireSession } from "@/lib/auth"
import { getUserSettings } from "@/lib/data/lookups"

export const metadata: Metadata = { title: "Notification settings" }

export default async function NotificationSettingsPage() {
  const { userId } = await requireSession()
  const s = await getUserSettings(userId)
  return (
    <SettingsSection title="Notifications" description="Choose which notifications you receive.">
      <NotificationPrefsForm
        settings={{
          hearing_reminders: s.hearing_reminders,
          deadline_reminders: s.deadline_reminders,
          task_reminders: s.task_reminders,
          case_updates: s.case_updates,
          email_notifications: s.email_notifications,
          in_app_notifications: s.in_app_notifications,
        }}
      />
    </SettingsSection>
  )
}
