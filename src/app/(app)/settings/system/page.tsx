import type { Metadata } from "next"
import { SettingsSection } from "@/components/settings/settings-section"
import { requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { APP_TIMEZONE } from "@/lib/datetime"
import { APP_NAME } from "@/lib/constants"

export const metadata: Metadata = { title: "System" }

type SystemInfo = { postgres_version: string; database_size: string; counts: Record<string, number> }

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b py-2 text-sm last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium tabular-nums">{value}</dd>
    </div>
  )
}

export default async function SystemPage() {
  await requireRole("administrator")
  const supabase = await createClient()
  const { data } = await supabase.rpc("get_system_info")
  const info = data as SystemInfo | null
  const supabaseHost = (() => {
    try {
      return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").host
    } catch {
      return "—"
    }
  })()

  return (
    <>
      <div className="grid gap-6 xl:grid-cols-2">
        <SettingsSection title="System information">
          <dl>
            <Row label="Application" value={APP_NAME} />
            <Row label="Environment" value={process.env.NODE_ENV} />
            <Row label="Time zone" value={APP_TIMEZONE} />
            <Row label="Supabase host" value={supabaseHost} />
            <Row label="Service role key configured" value={process.env.SUPABASE_SERVICE_ROLE_KEY ? "Yes" : "No — user management disabled"} />
          </dl>
        </SettingsSection>
        <SettingsSection title="Database information">
          {info ? (
            <dl>
              <Row label="PostgreSQL version" value={info.postgres_version} />
              <Row label="Database size" value={info.database_size} />
              {Object.entries(info.counts).map(([k, v]) => (
                <Row key={k} label={k.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())} value={v.toLocaleString()} />
              ))}
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">Database information is unavailable.</p>
          )}
        </SettingsSection>
      </div>
      <SettingsSection title="Backup information">
        <div className="grid gap-3 text-sm text-muted-foreground">
          <p>
            Case data lives in Supabase PostgreSQL and documents in the private <code className="rounded bg-muted px-1">case-documents</code> storage bucket.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Hosted Supabase projects include automated daily backups (Point-in-Time Recovery is available on paid plans) — manage them in the Supabase dashboard under Database → Backups.</li>
            <li>For an on-demand logical backup run <code className="rounded bg-muted px-1">supabase db dump --data-only -f backup.sql</code> with the Supabase CLI.</li>
            <li>Storage files are not included in database backups; copy the bucket separately (e.g. via the S3-compatible API).</li>
          </ul>
        </div>
      </SettingsSection>
    </>
  )
}
