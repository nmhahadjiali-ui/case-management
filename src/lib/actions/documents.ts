"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { requireSession } from "@/lib/auth"
import { canWrite } from "@/lib/permissions"
import { denied, fail, type ActionResult } from "@/lib/action-result"
import { DOCUMENT_CATEGORIES } from "@/lib/constants"
import { enumOf } from "@/lib/validations/helpers"

const BUCKET = "case-documents"

const documentSchema = z.object({
  case_id: z.uuid(),
  document_name: z.string().trim().min(1).max(255),
  category: enumOf(DOCUMENT_CATEGORIES),
  file_path: z.string().min(1).max(500),
  file_type: z.string().max(200),
  file_size: z.number().int().min(0).max(26214400),
})

/**
 * Save metadata for a file the browser has just uploaded to the private bucket.
 * The file itself is uploaded directly to Supabase Storage (protected by RLS).
 */
export async function registerDocument(values: z.input<typeof documentSchema>): Promise<ActionResult> {
  const session = await requireSession()
  if (!canWrite(session.profile.role)) return denied()
  const parsed = documentSchema.safeParse(values)
  if (!parsed.success || !parsed.data.file_path.startsWith(`${parsed.data.case_id}/`)) {
    return { ok: false, error: "Invalid document." }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("case_documents")
    .insert({ ...parsed.data, file_type: parsed.data.file_type || null, uploaded_by: session.userId })
  if (error) {
    await supabase.storage.from(BUCKET).remove([parsed.data.file_path])
    return fail(error, "registerDocument")
  }
  revalidatePath(`/cases/${parsed.data.case_id}`)
  return { ok: true, message: "Document uploaded." }
}

/** Short-lived signed URL for viewing or downloading a private document. */
export async function getDocumentUrl(id: string, download = false): Promise<ActionResult<{ url: string }>> {
  await requireSession()
  const supabase = await createClient()
  const { data: doc } = await supabase
    .from("case_documents")
    .select("file_path, document_name")
    .eq("id", id)
    .maybeSingle()
  if (!doc) return { ok: false, error: "Document not found." }

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(doc.file_path, 60, download ? { download: doc.document_name } : undefined)
  if (error || !data) return fail(error, "getDocumentUrl")
  return { ok: true, data: { url: data.signedUrl } }
}

export async function deleteDocument(id: string): Promise<ActionResult> {
  await requireSession()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("case_documents")
    .delete()
    .eq("id", id)
    .select("file_path, case_id")
  if (error) return fail(error, "deleteDocument")
  if (!data?.length) return denied()

  const { error: storageError } = await supabase.storage.from(BUCKET).remove([data[0].file_path])
  if (storageError) console.error("[deleteDocument storage]", storageError.message)

  revalidatePath(`/cases/${data[0].case_id}`)
  return { ok: true, message: "Document deleted." }
}
