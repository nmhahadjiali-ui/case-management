"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2Icon, Trash2Icon, UploadIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FormField } from "@/components/shared/form-field"
import { NativeSelect } from "@/components/shared/native-select"
import { UserAvatar } from "@/components/shared/user-avatar"
import { createClient } from "@/lib/supabase/client"
import { updateAvatar, updateProfile } from "@/lib/actions/settings"
import { profileSchema, type ProfileInput } from "@/lib/validations/settings"
import type { Department, Profile } from "@/lib/types"

export function AvatarUpload({ profile }: { profile: Profile }) {
  const router = useRouter()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [busy, setBusy] = React.useState(false)

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type)) {
      toast.error("Choose a PNG, JPEG, WebP or GIF image.")
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Images must be 2 MB or smaller.")
      return
    }
    setBusy(true)
    const supabase = createClient()
    const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "png"
    const path = `${profile.id}/avatar-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from("avatars").upload(path, file, { contentType: file.type })
    if (error) {
      setBusy(false)
      console.error(error)
      toast.error("Could not upload the image. Please try again.")
      return
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path)
    const res = await updateAvatar(data.publicUrl)
    setBusy(false)
    if (!res.ok) toast.error(res.error)
    else {
      toast.success(res.message)
      router.refresh()
    }
  }

  async function remove() {
    setBusy(true)
    const res = await updateAvatar(null)
    setBusy(false)
    if (!res.ok) toast.error(res.error)
    else {
      toast.success(res.message)
      router.refresh()
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <UserAvatar name={profile.full_name} src={profile.avatar_url} size="lg" className="size-16" />
      <div className="flex flex-wrap gap-2">
        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" onChange={onFile} aria-label="Upload profile picture" />
        <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy ? <Loader2Icon className="animate-spin" /> : <UploadIcon />} Upload picture
        </Button>
        {profile.avatar_url && (
          <Button variant="ghost" size="sm" onClick={remove} disabled={busy}>
            <Trash2Icon /> Remove
          </Button>
        )}
      </div>
      <p className="w-full text-xs text-muted-foreground">PNG, JPEG, WebP or GIF, up to 2 MB.</p>
    </div>
  )
}

export function ProfileForm({
  profile,
  departments,
  canEditEmail,
}: {
  profile: Profile
  departments: Department[]
  canEditEmail: boolean
}) {
  const router = useRouter()
  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: profile.full_name,
      department_id: profile.department_id ?? "",
      email: canEditEmail ? profile.email : undefined,
    },
  })
  const { errors, isSubmitting, isDirty } = form.formState

  async function onSubmit(values: ProfileInput) {
    const res = await updateProfile(values)
    if (!res.ok) {
      const emailError = res.fieldErrors?.email?.[0]
      if (emailError) form.setError("email", { message: emailError })
      toast.error(res.error)
      return
    }
    toast.success(res.message)
    form.reset(values)
    router.refresh()
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid max-w-xl gap-4" noValidate>
      <FormField label="Full name" htmlFor="full_name" error={errors.full_name?.message} required>
        <Input autoComplete="name" {...form.register("full_name")} />
      </FormField>
      {/* Non-administrators change their email through a request (see EmailChangePanel). */}
      {canEditEmail && (
        <FormField
          label="Email"
          htmlFor="email"
          error={errors.email?.message}
          description="This is your sign-in email. The change takes effect immediately."
          required
        >
          <Input type="email" autoComplete="email" {...form.register("email")} />
        </FormField>
      )}
      <FormField label="Department / Office" htmlFor="department_id" error={errors.department_id?.message}>
        <NativeSelect {...form.register("department_id")}>
          <option value="">None</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </NativeSelect>
      </FormField>
      <div>
        <Button type="submit" disabled={isSubmitting || !isDirty}>
          {isSubmitting && <Loader2Icon className="animate-spin" aria-hidden />} Save profile
        </Button>
      </div>
    </form>
  )
}
