import type { Metadata } from "next"
import { SettingsSection } from "@/components/settings/settings-section"
import { AvatarUpload, ProfileForm } from "@/components/settings/profile-forms"
import { EmailChangePanel } from "@/components/settings/email-requests"
import { UserRoleBadge } from "@/components/shared/badges"
import { requireSession } from "@/lib/auth"
import { getLookups } from "@/lib/data/lookups"
import { formatDate } from "@/lib/datetime"
import { isAdmin } from "@/lib/permissions"
import { createClient } from "@/lib/supabase/server"
import type { EmailChangeRequest } from "@/lib/types"

export const metadata: Metadata = { title: "Account settings" }

export default async function ProfileSettingsPage() {
  const [{ profile }, lookups] = await Promise.all([requireSession(), getLookups()])
  const admin = isAdmin(profile.role)

  let latestRequest: EmailChangeRequest | null = null
  if (!admin) {
    const supabase = await createClient()
    const { data } = await supabase
      .from("email_change_requests")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<EmailChangeRequest>()
    latestRequest = data
  }

  return (
    <>
      <SettingsSection title="Profile picture">
        <AvatarUpload profile={profile} />
      </SettingsSection>
      <SettingsSection title="Profile" description="Your name is shown in the header greeting, assignments and activity logs.">
        <ProfileForm profile={profile} departments={lookups.departments} canEditEmail={admin} />
      </SettingsSection>
      {!admin && (
        <SettingsSection title="Sign-in email" description="The email you use to sign in and receive password-reset links.">
          <EmailChangePanel email={profile.email} latest={latestRequest} />
        </SettingsSection>
      )}
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
