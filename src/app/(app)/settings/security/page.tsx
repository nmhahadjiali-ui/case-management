import type { Metadata } from "next"
import { SettingsSection } from "@/components/settings/settings-section"
import { ChangePasswordForm } from "@/components/auth/password-forms"
import { SessionsCard } from "@/components/settings/sessions-card"
import { requireSession } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { formatDateTime } from "@/lib/datetime"

export const metadata: Metadata = { title: "Security" }

export default async function SecurityPage() {
  const { userId } = await requireSession()
  const supabase = await createClient()
  const [{ data: claims }, { data: logins }] = await Promise.all([
    supabase.auth.getClaims(),
    supabase
      .from("activity_logs")
      .select("id, created_at")
      .eq("user_id", userId)
      .eq("action", "user.login")
      .order("created_at", { ascending: false })
      .limit(5),
  ])
  const issuedAt = claims?.claims?.iat ? new Date(Number(claims.claims.iat) * 1000).toISOString() : null

  return (
    <>
      <SettingsSection title="Change password" description="You will stay signed in on this device.">
        <ChangePasswordForm />
      </SettingsSection>
      <SettingsSection title="Sessions" description="Devices where your account is signed in.">
        <SessionsCard tokenIssuedAt={issuedAt} />
      </SettingsSection>
      <SettingsSection title="Recent sign-ins">
        {logins?.length ? (
          <ul className="divide-y text-sm">
            {logins.map((l) => (
              <li key={l.id} className="py-2">{formatDateTime(l.created_at)}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No sign-ins recorded yet.</p>
        )}
      </SettingsSection>
    </>
  )
}
