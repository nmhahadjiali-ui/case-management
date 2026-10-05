import "server-only"
import { cache } from "react"
import { createClient } from "@/lib/supabase/server"

export type Branding = {
  /** Custom app logo (sidebar, sign-in, About, browser tab); null = default scales icon. */
  appLogoUrl: string | null
  /** Custom splash-screen logo; null = default court seal. */
  splashLogoUrl: string | null
}

export const DEFAULT_SPLASH_LOGO = "/brand/court-seal.webp"
export const DEFAULT_FAVICON = "/brand/default-icon.svg"

/** Readable without signing in (see the branding migration). Deduplicated per request. */
export const getBranding = cache(async (): Promise<Branding> => {
  const supabase = await createClient()
  const { data } = await supabase.from("app_settings").select("value").eq("key", "branding").maybeSingle()
  const value = (data?.value ?? {}) as { app_logo_url?: string | null; splash_logo_url?: string | null }
  return { appLogoUrl: value.app_logo_url ?? null, splashLogoUrl: value.splash_logo_url ?? null }
})
