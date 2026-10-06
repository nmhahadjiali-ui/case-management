"use server"

import { revalidatePath, updateTag } from "next/cache"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireSession } from "@/lib/auth"
import { isAdmin } from "@/lib/permissions"
import { denied, fail, type ActionResult } from "@/lib/action-result"
import { BRANDING_TAG } from "@/lib/data/branding"

type AdminClient = ReturnType<typeof createAdminClient>

/** Re-checks the signed-in administrator's password without touching their session cookies. */
async function passwordMatches(email: string, userId: string, password: string) {
  const client = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error || data.user?.id !== userId) return false
  await client.auth.signOut({ scope: "local" }) // discard the throw-away session
  return true
}

/** Deletes every object in a bucket (optionally only under some top-level folders). Returns the count. */
async function emptyBucket(admin: AdminClient, bucket: string, keep: (topFolder: string) => boolean = () => false) {
  let removed = 0
  async function walk(prefix: string) {
    for (;;) {
      const { data, error } = await admin.storage.from(bucket).list(prefix, { limit: 1000 })
      if (error || !data?.length) return
      const files: string[] = []
      for (const entry of data) {
        const path = prefix ? `${prefix}/${entry.name}` : entry.name
        if (!prefix && keep(entry.name)) continue
        if (entry.id === null) await walk(path) // a folder
        else files.push(path)
      }
      if (!files.length) return
      const { error: removeError } = await admin.storage.from(bucket).remove(files)
      if (removeError) return
      removed += files.length
      if (data.length < 1000) return
    }
  }
  await walk("")
  return removed
}

export type ResetOptions = { password: string; deleteUsers: boolean; resetSettings: boolean }

/**
 * "Delete all data": removes every case record (cases, people, hearings/events,
 * tasks, notes, documents and their files, notifications, audit log, email
 * requests). Optionally removes all other user accounts and resets the oath
 * and logos to their defaults. Administrators only, password required.
 */
export async function resetAllData({ password, deleteUsers, resetSettings }: ResetOptions): Promise<ActionResult> {
  const session = await requireSession()
  if (!isAdmin(session.profile.role)) return denied()
  if (!password) return { ok: false, error: "Enter your password.", fieldErrors: { password: ["Password is required"] } }
  if (!(await passwordMatches(session.email, session.userId, password))) {
    return { ok: false, error: "Incorrect password. Nothing was deleted.", fieldErrors: { password: ["Incorrect password"] } }
  }

  const admin = createAdminClient()

  // 1. Database records (one transaction inside the function).
  const { error } = await admin.rpc("reset_all_data", { p_actor: session.userId, p_reset_settings: resetSettings })
  if (error) return fail(error, "resetAllData")

  // 2. Stored files. Leftovers would only waste space, so failures here are not fatal.
  await emptyBucket(admin, "case-documents")
  if (resetSettings) await emptyBucket(admin, "branding")

  // 3. Other user accounts (their profiles, settings and avatars go with them).
  let usersRemoved = 0
  if (deleteUsers) {
    for (let page = 1; ; page++) {
      const { data, error: listError } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
      if (listError) return fail({ message: listError.message }, "resetAllData.listUsers")
      for (const user of data.users) {
        if (user.id === session.userId) continue
        const { error: deleteError } = await admin.auth.admin.deleteUser(user.id)
        if (!deleteError) usersRemoved++
      }
      if (data.users.length < 1000) break
    }
    await emptyBucket(admin, "avatars", (folder) => folder === session.userId)
  }

  if (resetSettings) updateTag(BRANDING_TAG)
  revalidatePath("/", "layout")

  const parts = ["All case data deleted"]
  if (deleteUsers) parts.push(`${usersRemoved} other user account${usersRemoved === 1 ? "" : "s"} removed`)
  if (resetSettings) parts.push("settings reset to defaults")
  return { ok: true, message: `${parts.join(", ")}.` }
}
