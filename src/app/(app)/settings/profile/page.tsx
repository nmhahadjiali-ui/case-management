import type { Metadata } from "next"
import { SettingsSection } from "@/components/settings/settings-section"
import { AvatarUpload, ProfileForm } from "@/components/settings/profile-forms"
import { UserRoleBadge } from "@/components/shared/badges"
import { requireSession } from "@/lib/auth"
import { getLookups } from "@/lib/data/lookups"
import { formatDate } from "@/lib/datetime"

export const metadata: Metadata = { title: "Account settings" }

export default async function ProfileSettingsPage() {
  const [{ profile }, lookups] = await Promise.all([requireSession(), getLookups()])
  return (
    <>
      <SettingsSection title="Profile picture">
        <AvatarUpload profile={profile} />
      </SettingsSection>
      <SettingsSection title="Profile" description="Your name is shown in the header greeting, assignments and activity logs.">
        <ProfileForm profile={profile} departments={lookups.departments} />
      </SettingsSection>
      <SettingsSection title="Account details">
        <dl className="grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">Role</dt>
            <dd className="mt-1"><UserRoleBadge role={profile.role} /></dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Member since</dt>
            <dd className="mt-1">{formatDate(profile.created_at, "long")}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Last updated</dt>
            <dd className="mt-1">{formatDate(profile.updated_at, "long")}</dd>
          </div>
        </dl>
      </SettingsSection>
    </>
  )
}
