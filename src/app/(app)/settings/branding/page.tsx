import type { Metadata } from "next"
import { SettingsSection } from "@/components/settings/settings-section"
import { LogoSetting } from "@/components/settings/branding-forms"
import { requireRole } from "@/lib/auth"
import { getBranding } from "@/lib/data/branding"

export const metadata: Metadata = { title: "Branding" }

export default async function BrandingPage() {
  await requireRole("administrator")
  const branding = await getBranding()
  return (
    <>
      <SettingsSection title="App logo" description="Shown in the sidebar, on the sign-in page, on the About page and as the browser-tab icon.">
        <LogoSetting kind="app" url={branding.appLogoUrl} defaultLabel="blue scales icon" />
      </SettingsSection>
      <SettingsSection title="Splash screen logo" description="Shown on the loading screen when the app is opened.">
        <LogoSetting kind="splash" url={branding.splashLogoUrl} defaultLabel="Shari'ah Court of Appeal seal" />
      </SettingsSection>
    </>
  )
}
