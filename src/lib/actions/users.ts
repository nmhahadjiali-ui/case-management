"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireSession } from "@/lib/auth"
import { isAdmin } from "@/lib/permissions"
import { denied, fail, invalid, type ActionResult } from "@/lib/action-result"
import { newUserSchema, updateUserSchema, type NewUserInput, type UpdateUserInput } from "@/lib/validations/settings"
import { nullIfEmpty } from "@/lib/validations/helpers"

async function activeAdminCount() {
  const supabase = await createClient()
  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "administrator")
    .eq("is_active", true)
  return count ?? 0
}

/** Create a user account with a temporary password (administrators only). */
export async function createUser(values: NewUserInput): Promise<ActionResult> {
  const session = await requireSession()
  if (!isAdmin(session.profile.role)) return denied()
  const parsed = newUserSchema.safeParse(values)
  if (!parsed.success) return invalid(parsed.error)

  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.full_name },
  })
  if (error || !data.user) {
    if (error?.message?.toLowerCase().includes("already")) {
      return { ok: false, error: "A user with this email already exists.", fieldErrors: { email: ["Email already registered"] } }
    }
    return fail(error ? { message: error.message } : null, "createUser")
  }

  // The signup trigger created the profile; set the requested role.
  const { error: roleError } = await admin.from("profiles").update({ role: parsed.data.role }).eq("id", data.user.id)
  if (roleError) return fail(roleError, "createUser.role")

  revalidatePath("/settings/users")
  return { ok: true, message: `Account created for ${parsed.data.full_name}.` }
}

export async function updateUser(userId: string, values: UpdateUserInput): Promise<ActionResult> {
  const session = await requireSession()
  if (!isAdmin(session.profile.role)) return denied()
  const parsed = updateUserSchema.safeParse(values)
  if (!parsed.success) return invalid(parsed.error)

  if (userId === session.userId && parsed.data.role !== "administrator" && (await activeAdminCount()) <= 1) {
    return { ok: false, error: "You are the only administrator. Assign another administrator first." }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("profiles")
    .update({ role: parsed.data.role, department_id: nullIfEmpty(parsed.data.department_id) })
    .eq("id", userId)
  if (error) return fail(error, "updateUser")
  revalidatePath("/settings/users")
  return { ok: true, message: "User updated." }
}

/** Activate or deactivate an account. Deactivated users are also blocked from signing in. */
export async function setUserActive(userId: string, active: boolean): Promise<ActionResult> {
  const session = await requireSession()
  if (!isAdmin(session.profile.role)) return denied()
  if (userId === session.userId) return { ok: false, error: "You cannot deactivate your own account." }

  const supabase = await createClient()
  const { error } = await supabase.from("profiles").update({ is_active: active }).eq("id", userId)
  if (error) return fail(error, "setUserActive")

  try {
    const admin = createAdminClient()
    await admin.auth.admin.updateUserById(userId, { ban_duration: active ? "none" : "876000h" })
  } catch (e) {
    // The profile flag alone already blocks all data access through RLS.
    console.error("[setUserActive ban]", e)
  }

  revalidatePath("/settings/users")
  return { ok: true, message: active ? "User activated." : "User deactivated." }
}
