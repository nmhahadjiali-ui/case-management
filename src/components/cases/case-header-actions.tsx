"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArchiveIcon, MoreHorizontalIcon, PencilIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"
import { Button, buttonVariants } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { archiveCases, deleteCases } from "@/lib/actions/cases"

export function CaseHeaderActions({
  caseId,
  caseNumber,
  canEdit,
  canDelete,
  archived,
}: {
  caseId: string
  caseNumber: string
  canEdit: boolean
  canDelete: boolean
  archived: boolean
}) {
  const router = useRouter()
  const [confirm, setConfirm] = React.useState<"archive" | "delete" | null>(null)

  if (!canEdit && !canDelete) return null

  return (
    <>
      {canEdit && (
        <Link href={`/cases/${caseId}/edit`} className={buttonVariants({ variant: "outline" })}>
          <PencilIcon aria-hidden /> Edit
        </Link>
      )}
      {(canDelete || (canEdit && !archived)) && (
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" size="icon" aria-label="More case actions" />}>
            <MoreHorizontalIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            {canEdit && !archived && (
              <DropdownMenuItem onClick={() => setConfirm("archive")}>
                <ArchiveIcon /> Archive
              </DropdownMenuItem>
            )}
            {canDelete && (
              <DropdownMenuItem variant="destructive" onClick={() => setConfirm("delete")}>
                <Trash2Icon /> Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm === "delete" ? `Delete case ${caseNumber}?` : `Archive case ${caseNumber}?`}
        description={
          confirm === "delete"
            ? "This action cannot be undone. All parties, hearings, tasks, notes and documents linked to this case will also be deleted."
            : "The case will be hidden from the default case list. You can change its status again later."
        }
        confirmLabel={confirm === "delete" ? "Delete" : "Archive"}
        destructive={confirm === "delete"}
        onConfirm={async () => {
          const res = confirm === "delete" ? await deleteCases([caseId]) : await archiveCases([caseId])
          if (!res.ok) {
            toast.error(res.error)
            return false
          }
          toast.success(confirm === "delete" ? "Case deleted." : "Case archived.")
          if (confirm === "delete") router.push("/cases")
          router.refresh()
        }}
      />
    </>
  )
}
