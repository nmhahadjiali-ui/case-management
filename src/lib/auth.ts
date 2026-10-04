import "server-only"
import { cache } from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import type { UserRole } from "@/lib/constants"
import type { Profile } from "@/lib/types"

export type Session = { userId: string; email: string; profile: Profile }

/** The signed-in user and profile, or null. Cached per request. */
export const getSession = cache(async (): Promise<Session | null> => {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle<Profile>()
  if (!profile) return null

  return { userId, email: profile.email, profile }
})

/** Use at the top of protected pages/actions. Redirects when signed out or deactivated. */
export async function requireSession(): Promise<Session> {
  const session = await getSession()
  if (!session) redirect("/login")
  if (!session.profile.is_active) redirect("/auth/signout?reason=inactive")
  return session
}

/** Like requireSession, but also enforces a role (redirects to the dashboard otherwise). */
export async function requireRole(...roles: UserRole[]): Promise<Session> {
  const session = await requireSession()
  if (!roles.includes(session.profile.role)) redirect("/dashboard?denied=1")
  return session
}
