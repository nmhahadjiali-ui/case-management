"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireSession } from "@/lib/auth"
import { isAdmin } from "@/lib/permissions"
import { denied, fail, invalid, type ActionResult } from "@/lib/action-result"
import { emailChangeRequestSchema, type EmailChangeRequestInput } from "@/lib/validations/settings"
import { nullIfEmpty } from "@/lib/validations/helpers"
import type { EmailChangeRequest } from "@/lib/types"

const taken = { ok: false as const, error: "That email is already used by another account.", fieldErrors: { new_email: ["Email already registered"] } }

async function emailInUse(email: string, exceptUserId: string) {
  const supabase = await createClient()
  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("email", email) // Supabase Auth stores emails lower-cased
    .neq("id", exceptUserId)
  return (count ?? 0) > 0
}

/** Ask an administrator to change the signed-in user's email. */
export async function requestEmailChange(values: EmailChangeRequestInput): Promise<ActionResult> {
  const session = await requireSession()
  const parsed = emailChangeRequestSchema.safeParse(values)
  if (!parsed.success) return invalid(parsed.error)

  const newEmail = parsed.data.new_email.trim().toLowerCase()
  if (newEmail === session.profile.email.toLowerCase()) {
    return { ok: false, error: "That is already your email.", fieldErrors: { new_email: ["Same as your current email"] } }
  }
  if (await emailInUse(newEmail, session.userId)) return taken

  const supabase = await createClient()
  const { error } = await supabase.from("email_change_requests").insert({
    user_id: session.userId,
    current_email: session.profile.email,
    new_email: newEmail,
    reason: nullIfEmpty(parsed.data.reason),
  })
  if (error?.code === "23505") return { ok: false, error: "You already have a pending request. Cancel it first to submit a new one." }
  if (error) return fail(error, "requestEmailChange")
  revalidatePath("/settings/profile")
  return { ok: true, message: "Request sent. An administrator will review it." }
}

export async function cancelEmailChangeRequest(id: string): Promise<ActionResult> {
  const session = await requireSession()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("email_change_requests")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("user_id", session.userId)
    .eq("status", "pending")
    .select("id")
  if (error) return fail(error, "cancelEmailChangeRequest")
  if (!data?.length) return { ok: false, error: "This request is no longer pending." }
  revalidatePath("/settings/profile")
  return { ok: true, message: "Request cancelled." }
}

/** Approve (and apply) or reject a pending request. Administrators only. */
export async function reviewEmailChangeRequest(id: string, approve: boolean, note = ""): Promise<ActionResult> {
  const session = await requireSession()
  if (!isAdmin(session.profile.role)) return denied()

  const supabase = await createClient()
  const { data: request } = await supabase
    .from("email_change_requests")
    .select("*")
    .eq("id", id)
    .eq("status", "pending")
    .maybeSingle<EmailChangeRequest>()
  if (!request) return { ok: false, error: "This request is no longer pending." }

  if (approve) {
    if (await emailInUse(request.new_email, request.user_id)) {
      return { ok: false, error: `${request.new_email} is now used by another account. Reject this request instead.` }
    }
    // The on_auth_user_email_changed trigger syncs profiles.email.
    const { error } = await createAdminClient().auth.admin.updateUserById(request.user_id, {
      email: request.new_email,
      email_confirm: true,
    })
    if (error) return fail({ message: error.message }, "reviewEmailChangeRequest.updateUser")
  }

  const { error } = await supabase
    .from("email_change_requests")
    .update({
      status: approve ? "approved" : "rejected",
      review_note: nullIfEmpty(note.trim().slice(0, 500)),
      reviewed_by: session.userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id)
  if (error) return fail(error, "reviewEmailChangeRequest")

  revalidatePath("/settings/users")
  return { ok: true, message: approve ? `Email changed to ${request.new_email}.` : "Request rejected." }
}
