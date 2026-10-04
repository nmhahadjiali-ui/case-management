"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { PencilIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"
import { Button, buttonVariants } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { NotesPanel } from "@/components/shared/notes-panel"
import { addPersonNote, deletePerson, deletePersonNote } from "@/lib/actions/people"
import { canDeleteOwned, canManage } from "@/lib/permissions"
import type { UserRole } from "@/lib/constants"
import type { Note } from "@/lib/types"

export function PersonActions({ personId, name, canEdit, canDelete }: { personId: string; name: string; canEdit: boolean; canDelete: boolean }) {
  const router = useRouter()
  const [confirm, setConfirm] = React.useState(false)
  return (
    <>
      {canEdit && (
        <Link href={`/people/${personId}/edit`} className={buttonVariants({ variant: "outline" })}>
          <PencilIcon aria-hidden /> Edit
        </Link>
      )}
      {canDelete && (
        <Button variant="destructive" onClick={() => setConfirm(true)}>
          <Trash2Icon aria-hidden /> Delete
        </Button>
      )}
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={`Delete ${name}?`}
        description="This action cannot be undone. People who are parties to cases cannot be deleted; mark them inactive instead."
        onConfirm={async () => {
          const res = await deletePerson(personId)
          if (!res.ok) {
            toast.error(res.error)
            return false
          }
          toast.success("Person deleted.")
          router.push("/people")
          router.refresh()
        }}
      />
    </>
  )
}

export function PersonNotes({ personId, notes, role, userId }: { personId: string; notes: Note[]; role: UserRole; userId: string }) {
  return (
    <NotesPanel
      notes={notes}
      canAdd={role !== "viewer"}
      canDelete={(n) => canManage(role) || canDeleteOwned(role, userId, n.created_by)}
      onAdd={(body) => addPersonNote(personId, body)}
      onDelete={(id) => deletePersonNote(id, personId)}
    />
  )
}
