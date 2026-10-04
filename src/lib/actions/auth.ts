"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { requireSession } from "@/lib/auth"
import { fail, invalid, type ActionResult } from "@/lib/action-result"
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  type ChangePasswordInput,
  type ForgotPasswordInput,
  type LoginInput,
  type ResetPasswordInput,
} from "@/lib/validations/auth"

/** Only allow redirects to paths inside this app. */
function safeNext(next: string | undefined) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard"
}

export async function signIn(values: LoginInput, next?: string): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(values)
  if (!parsed.success) return invalid(parsed.error)

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) {
    // Same message for unknown email and wrong password.
    return { ok: false, error: "Invalid email or password." }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_active")
    .eq("id", data.user.id)
    .maybeSingle()
  if (profile && !profile.is_active) {
    await supabase.auth.signOut()
    return { ok: false, error: "Your account has been deactivated. Contact an administrator." }
  }

  await supabase.rpc("log_login")
  redirect(safeNext(next))
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}

export async function requestPasswordReset(values: ForgotPasswordInput): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(values)
  if (!parsed.success) return invalid(parsed.error)

  const h = await headers()
  const origin = process.env.NEXT_PUBLIC_SITE_URL || h.get("origin") || `https://${h.get("host")}`
  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  })
  if (error) console.error("[requestPasswordReset]", error.message)

  // Always report success so the form cannot be used to discover accounts.
  return {
    ok: true,
    message: "If an account exists for that email, a password reset link has been sent.",
  }
}

/** Sets a new password after following the reset link (user has a recovery session). */
export async function resetPassword(values: ResetPasswordInput): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(values)
  if (!parsed.success) return invalid(parsed.error)

  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  if (!data?.claims) {
    return { ok: false, error: "Your reset link has expired. Please request a new one." }
  }
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) return fail(error, "resetPassword")
  redirect("/dashboard?password=updated")
}

export async function changePassword(values: ChangePasswordInput): Promise<ActionResult> {
  const session = await requireSession()
  const parsed = changePasswordSchema.safeParse(values)
  if (!parsed.success) return invalid(parsed.error)

  const supabase = await createClient()
  // Re-authenticate to confirm the current password.
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: session.email,
    password: parsed.data.currentPassword,
  })
  if (authError) {
    return { ok: false, error: "Current password is incorrect.", fieldErrors: { currentPassword: ["Incorrect password"] } }
  }
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) return fail(error, "changePassword")
  return { ok: true, message: "Password updated." }
}

export async function signOutOtherSessions(): Promise<ActionResult> {
  await requireSession()
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut({ scope: "others" })
  if (error) return fail(error, "signOutOtherSessions")
  return { ok: true, message: "Signed out of all other sessions." }
}

export async function signOutEverywhere() {
  const supabase = await createClient()
  await supabase.auth.signOut({ scope: "global" })
  redirect("/login")
}
