import type { Metadata } from "next"
import { UserIcon } from "lucide-react"
import { BrandLogo } from "@/components/shared/brand-logo"
import { SettingsSection } from "@/components/settings/settings-section"
import { requireSession } from "@/lib/auth"
import { getBranding } from "@/lib/data/branding"
import { APP_COPYRIGHT_START, APP_DEVELOPER, APP_NAME, APP_TAGLINE } from "@/lib/constants"
import pkg from "@/../package.json"

export const metadata: Metadata = { title: "About & Credits" }

const deps: Record<string, string> = { ...pkg.dependencies, ...pkg.devDependencies }
const version = (name: string) => deps[name]?.replace(/^[\^~]/, "")

const BUILT_WITH: { name: string; pkg: string; url: string; purpose: string }[] = [
  { name: "Next.js", pkg: "next", url: "https://nextjs.org", purpose: "Application framework" },
  { name: "React", pkg: "react", url: "https://react.dev", purpose: "User interface" },
  { name: "TypeScript", pkg: "typescript", url: "https://www.typescriptlang.org", purpose: "Language" },
  { name: "Supabase", pkg: "@supabase/supabase-js", url: "https://supabase.com", purpose: "Database, authentication and storage" },
  { name: "Tailwind CSS", pkg: "tailwindcss", url: "https://tailwindcss.com", purpose: "Styling" },
  { name: "shadcn/ui", pkg: "shadcn", url: "https://ui.shadcn.com", purpose: "UI components" },
  { name: "Base UI", pkg: "@base-ui/react", url: "https://base-ui.com", purpose: "Accessible primitives" },
  { name: "Lucide", pkg: "lucide-react", url: "https://lucide.dev", purpose: "Icons" },
  { name: "Recharts", pkg: "recharts", url: "https://recharts.org", purpose: "Charts" },
  { name: "React Hook Form", pkg: "react-hook-form", url: "https://react-hook-form.com", purpose: "Forms" },
  { name: "Zod", pkg: "zod", url: "https://zod.dev", purpose: "Validation" },
  { name: "date-fns", pkg: "date-fns", url: "https://date-fns.org", purpose: "Dates" },
]

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b py-2 text-sm last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  )
}

export default async function AboutPage() {
  const [, branding] = await Promise.all([requireSession(), getBranding()])
  const year = new Date().getFullYear()
  const years = year > APP_COPYRIGHT_START ? `${APP_COPYRIGHT_START}–${year}` : `${APP_COPYRIGHT_START}`

  return (
    <>
      <SettingsSection title="About">
        <div className="grid gap-6 sm:grid-cols-[auto_1fr] sm:items-start">
          <BrandLogo src={branding.appLogoUrl} size="lg" />
          <div className="grid gap-4">
            <div>
              <p className="text-lg font-semibold">{APP_NAME}</p>
              <p className="text-sm text-muted-foreground">{APP_TAGLINE}</p>
            </div>
            <p className="text-sm leading-relaxed">
              {APP_NAME} helps courts and legal offices manage cases, parties, hearings, tasks, documents and
              notifications in one place, with role-based access and a complete audit trail.
            </p>
            <dl>
              <Row label="Version" value={pkg.version} />
              <Row label="Developer" value={APP_DEVELOPER} />
              <Row label="Copyright" value={`© ${years} ${APP_NAME}`} />
            </dl>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="Credits">
        <div className="grid gap-6">
          <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UserIcon className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="font-medium">{APP_DEVELOPER}</p>
              <p className="text-xs text-muted-foreground">Design &amp; development</p>
            </div>
          </div>

          <div className="grid gap-2">
            <h3 className="text-sm font-semibold">Built with</h3>
            <p className="text-xs text-muted-foreground">
              {APP_NAME} is built on these open-source projects. Thanks to their authors and contributors.
            </p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {BUILT_WITH.map((t) => (
                <li key={t.name}>
                  <a
                    href={t.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2 text-sm hover:bg-muted/50"
                  >
                    <span className="min-w-0">
                      <span className="block font-medium">{t.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{t.purpose}</span>
                    </span>
                    {version(t.pkg) && <span className="shrink-0 text-xs text-muted-foreground tabular-nums">v{version(t.pkg)}</span>}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </SettingsSection>
    </>
  )
}
