"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2Icon, UserPlusIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FormField } from "@/components/shared/form-field"
import { NativeSelect } from "@/components/shared/native-select"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { UserAvatar } from "@/components/shared/user-avatar"
import { createUser, setUserActive, updateUser } from "@/lib/actions/users"
import { newUserSchema, type NewUserInput } from "@/lib/validations/settings"
import { USER_ROLES, type UserRole } from "@/lib/constants"
import { formatDate } from "@/lib/datetime"
import type { Department, Profile } from "@/lib/types"

export function UsersManager({ users, departments, currentUserId }: { users: Profile[]; departments: Department[]; currentUserId: string }) {
  const router = useRouter()
  const [creating, setCreating] = React.useState(false)
  const [deactivate, setDeactivate] = React.useState<Profile | null>(null)

  async function change(user: Profile, patch: { role?: UserRole; department_id?: string }) {
    const res = await updateUser(user.id, {
      role: patch.role ?? user.role,
      department_id: patch.department_id ?? user.department_id ?? "",
    })
    if (!res.ok) toast.error(res.error)
    else {
      toast.success(res.message)
      router.refresh()
    }
  }

  async function setActive(user: Profile, active: boolean) {
    const res = await setUserActive(user.id, active)
    if (!res.ok) {
      toast.error(res.error)
      return false
    }
    toast.success(res.message)
    router.refresh()
  }

  return (
    <div className="grid gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreating(true)}>
          <UserPlusIcon /> Add user
        </Button>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <Table className="min-w-[720px]">
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Active</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => {
              const self = u.id === currentUserId
              return (
                <TableRow key={u.id} className={!u.is_active ? "opacity-60" : undefined}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <UserAvatar name={u.full_name} src={u.avatar_url} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{u.full_name}{self && <span className="ml-1 text-xs text-muted-foreground">(you)</span>}</p>
                        <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <NativeSelect value={u.role} onChange={(e) => change(u, { role: e.target.value as UserRole })} aria-label={`Role for ${u.full_name}`} className="w-40">
                      {USER_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </NativeSelect>
                  </TableCell>
                  <TableCell>
                    <NativeSelect value={u.department_id ?? ""} onChange={(e) => change(u, { department_id: e.target.value })} aria-label={`Department for ${u.full_name}`} className="w-44">
                      <option value="">None</option>
                      {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </NativeSelect>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(u.created_at)}</TableCell>
                  <TableCell>
                    <Switch
                      checked={u.is_active}
                      disabled={self}
                      onCheckedChange={(v) => (v ? setActive(u, true) : setDeactivate(u))}
                      aria-label={`${u.full_name} active`}
                    />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add user</DialogTitle>
            <DialogDescription>Share the temporary password securely; the user can change it under Settings → Security.</DialogDescription>
          </DialogHeader>
          <NewUserForm onDone={() => { setCreating(false); router.refresh() }} />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deactivate !== null}
        onOpenChange={(o) => !o && setDeactivate(null)}
        title={`Deactivate ${deactivate?.full_name}?`}
        description="They will be signed out and blocked from signing in. Their records and history are kept. You can reactivate them at any time."
        confirmLabel="Deactivate"
        onConfirm={() => setActive(deactivate!, false)}
      />
    </div>
  )
}

function NewUserForm({ onDone }: { onDone: () => void }) {
  const form = useForm<NewUserInput>({
    resolver: zodResolver(newUserSchema),
    defaultValues: { full_name: "", email: "", role: "staff", password: "" },
  })
  const { errors, isSubmitting } = form.formState

  async function onSubmit(v: NewUserInput) {
    const res = await createUser(v)
    if (!res.ok) {
      for (const [field, msgs] of Object.entries(res.fieldErrors ?? {})) form.setError(field as keyof NewUserInput, { message: msgs[0] })
      toast.error(res.error)
      return
    }
    toast.success(res.message)
    onDone()
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4" noValidate>
      <FormField label="Full name" htmlFor="nu_name" error={errors.full_name?.message} required>
        <Input {...form.register("full_name")} />
      </FormField>
      <FormField label="Email" htmlFor="nu_email" error={errors.email?.message} required>
        <Input type="email" autoComplete="off" {...form.register("email")} />
      </FormField>
      <FormField label="Role" htmlFor="nu_role" error={errors.role?.message} required>
        <NativeSelect {...form.register("role")}>
          {USER_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </NativeSelect>
      </FormField>
      <FormField label="Temporary password" htmlFor="nu_password" error={errors.password?.message} required description="At least 8 characters with a letter and a number.">
        <Input type="text" autoComplete="new-password" {...form.register("password")} />
      </FormField>
      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2Icon className="animate-spin" />} Create account
        </Button>
      </div>
    </form>
  )
}
