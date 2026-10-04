"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2Icon, PencilIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { FormField } from "@/components/shared/form-field"
import { updateOath } from "@/lib/actions/settings"
import { oathSchema, type OathInput } from "@/lib/validations/settings"

/** Administrators can edit the oath text shown on /oath. */
export function OathEditor({ title, body }: OathInput) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const form = useForm<OathInput>({ resolver: zodResolver(oathSchema), defaultValues: { title, body } })
  const { errors, isSubmitting } = form.formState

  async function onSubmit(values: OathInput) {
    const res = await updateOath(values)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    toast.success("Oath updated.")
    setOpen(false)
    router.refresh()
  }

  if (!open) {
    return (
      <div className="flex justify-center">
        <Button variant="outline" onClick={() => setOpen(true)}>
          <PencilIcon aria-hidden /> Edit oath
        </Button>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit oath</CardTitle>
        <CardDescription>Separate paragraphs with a blank line.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4" noValidate>
          <FormField label="Title" htmlFor="oath_title" error={errors.title?.message} required>
            <Input {...form.register("title")} />
          </FormField>
          <FormField label="Text" htmlFor="oath_body" error={errors.body?.message} required>
            <Textarea rows={12} {...form.register("body")} />
          </FormField>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2Icon className="animate-spin" aria-hidden />} Save
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
