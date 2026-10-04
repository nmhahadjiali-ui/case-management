"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { DownloadIcon, ExternalLinkIcon, FileIcon, FileTextIcon, ImageIcon, Loader2Icon, Trash2Icon, UploadIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/shared/native-select"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { EmptyState } from "@/components/shared/empty-state"
import { Pill } from "@/components/shared/badges"
import { createClient } from "@/lib/supabase/client"
import { deleteDocument, getDocumentUrl, registerDocument } from "@/lib/actions/documents"
import { DOCUMENT_CATEGORIES, labelOf, type DocumentCategory } from "@/lib/constants"
import { formatDateTime } from "@/lib/datetime"
import type { CaseDocument } from "@/lib/types"

const MAX_BYTES = 25 * 1024 * 1024

function formatSize(bytes: number | null) {
  if (bytes === null) return "—"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function iconFor(type: string | null) {
  if (type?.startsWith("image/")) return ImageIcon
  if (type?.includes("pdf") || type?.startsWith("text/") || type?.includes("word")) return FileTextIcon
  return FileIcon
}

export function DocumentsPanel({
  caseId,
  documents,
  canUpload,
  canDelete,
}: {
  caseId: string
  documents: CaseDocument[]
  canUpload: boolean
  canDelete: (doc: CaseDocument) => boolean
}) {
  const router = useRouter()
  const fileRef = React.useRef<HTMLInputElement>(null)
  const [category, setCategory] = React.useState<DocumentCategory>("complaint")
  const [uploading, setUploading] = React.useState(false)
  const [opening, setOpening] = React.useState<string | null>(null)
  const [toDelete, setToDelete] = React.useState<CaseDocument | null>(null)

  async function upload(e: React.FormEvent) {
    e.preventDefault()
    const files = Array.from(fileRef.current?.files ?? [])
    if (!files.length) {
      toast.error("Choose a file to upload.")
      return
    }
    const tooBig = files.find((f) => f.size > MAX_BYTES)
    if (tooBig) {
      toast.error(`${tooBig.name} is larger than 25 MB.`)
      return
    }

    setUploading(true)
    const supabase = createClient()
    let uploaded = 0
    for (const file of files) {
      const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(-120)
      const path = `${caseId}/${crypto.randomUUID()}-${safeName}`
      const { error } = await supabase.storage
        .from("case-documents")
        .upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false })
      if (error) {
        console.error(error)
        toast.error(`Could not upload ${file.name}. Please try again.`)
        continue
      }
      const res = await registerDocument({
        case_id: caseId,
        document_name: file.name.slice(0, 255),
        category,
        file_path: path,
        file_type: file.type,
        file_size: file.size,
      })
      if (!res.ok) toast.error(res.error)
      else uploaded++
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ""
    if (uploaded) {
      toast.success(`${uploaded} document${uploaded === 1 ? "" : "s"} uploaded.`)
      router.refresh()
    }
  }

  async function open(doc: CaseDocument, download: boolean) {
    setOpening(doc.id)
    // Open the tab synchronously so pop-up blockers allow it.
    const win = download ? null : window.open("about:blank", "_blank")
    const res = await getDocumentUrl(doc.id, download)
    setOpening(null)
    if (!res.ok) {
      win?.close()
      toast.error(res.error)
      return
    }
    if (download) window.location.assign(res.data!.url)
    else win?.location.replace(res.data!.url)
  }

  return (
    <div className="grid gap-4">
      {canUpload && (
        <form onSubmit={upload} className="grid gap-3 rounded-lg border border-dashed p-4 sm:grid-cols-[1fr_200px_auto] sm:items-end">
          <div className="grid gap-1.5">
            <Label htmlFor="doc-file">File</Label>
            <Input id="doc-file" ref={fileRef} type="file" multiple disabled={uploading} />
            <p className="text-xs text-muted-foreground">Up to 25 MB per file. Files are stored privately.</p>
          </div>
          <div className="grid gap-1.5 sm:self-start">
            <Label htmlFor="doc-category">Category</Label>
            <NativeSelect id="doc-category" value={category} onChange={(e) => setCategory(e.target.value as DocumentCategory)}>
              {DOCUMENT_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </NativeSelect>
          </div>
          <Button type="submit" disabled={uploading} className="sm:mb-5">
            {uploading ? <Loader2Icon className="animate-spin" aria-hidden /> : <UploadIcon aria-hidden />}
            Upload
          </Button>
        </form>
      )}

      {documents.length === 0 ? (
        <EmptyState icon={FileIcon} title="No documents yet" description="Complaints, affidavits, orders and other files will appear here." />
      ) : (
        <ul className="divide-y rounded-lg border">
          {documents.map((d) => {
            const Icon = iconFor(d.file_type)
            return (
              <li key={d.id} className="flex flex-wrap items-center gap-3 p-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Icon className="size-4 text-muted-foreground" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium" title={d.document_name}>{d.document_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatSize(d.file_size)} · {d.uploader?.full_name ?? "Unknown"} · {formatDateTime(d.created_at)}
                  </p>
                </div>
                <Pill className="border-border bg-muted text-foreground">{labelOf(DOCUMENT_CATEGORIES, d.category)}</Pill>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon-sm" onClick={() => open(d, false)} disabled={opening === d.id} aria-label={`View ${d.document_name}`}>
                    {opening === d.id ? <Loader2Icon className="animate-spin" /> : <ExternalLinkIcon />}
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => open(d, true)} disabled={opening === d.id} aria-label={`Download ${d.document_name}`}>
                    <DownloadIcon />
                  </Button>
                  {canDelete(d) && (
                    <Button variant="ghost" size="icon-sm" onClick={() => setToDelete(d)} aria-label={`Delete ${d.document_name}`}>
                      <Trash2Icon />
                    </Button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete document?"
        description={`"${toDelete?.document_name}" will be permanently deleted. This action cannot be undone.`}
        onConfirm={async () => {
          const res = await deleteDocument(toDelete!.id)
          if (!res.ok) {
            toast.error(res.error)
            return false
          }
          toast.success("Document deleted.")
          router.refresh()
        }}
      />
    </div>
  )
}
