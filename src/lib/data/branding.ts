import "server-only"
import { cache } from "react"
import { unstable_cache } from "next/cache"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

export type Branding = {
  /** Custom app logo (sidebar, sign-in, About, browser tab); null = default scales icon. */
  appLogoUrl: string | null
  /** Custom splash-screen logo; null = default court seal. */
  splashLogoUrl: string | null
}

export const DEFAULT_SPLASH_LOGO = "/brand/court-seal.webp"
export const DEFAULT_FAVICON = "/brand/default-icon.svg"
/** Cache tag; updateBrandingLogo() calls updateTag(BRANDING_TAG) after a change. */
export const BRANDING_TAG = "branding"

// The branding row is public (see the branding migration), so it is read with the
// anon key and no cookies. That lets Next cache it across requests instead of
// making a database round trip on every page.
const readBranding = unstable_cache(
  async (): Promise<Branding> => {
    const supabase = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data } = await supabase.from("app_settings").select("value").eq("key", "branding").maybeSingle()
    const value = (data?.value ?? {}) as { app_logo_url?: string | null; splash_logo_url?: string | null }
    return { appLogoUrl: value.app_logo_url ?? null, splashLogoUrl: value.splash_logo_url ?? null }
  },
  ["branding"],
  { tags: [BRANDING_TAG], revalidate: 3600 }
)

export const getBranding = cache(readBranding)
