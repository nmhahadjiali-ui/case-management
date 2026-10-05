"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { AlignCenterIcon, AlignJustifyIcon, AlignLeftIcon, AlignRightIcon, Loader2Icon, PencilIcon, type LucideIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { FormField } from "@/components/shared/form-field"
import { updateOath } from "@/lib/actions/settings"
import { oathSchema, type OathAlign, type OathInput } from "@/lib/validations/settings"
import { cn } from "@/lib/utils"

const ALIGN_OPTIONS: { value: OathAlign; label: string; icon: LucideIcon; className: string }[] = [
  { value: "center", label: "Center", icon: AlignCenterIcon, className: "text-center" },
  { value: "left", label: "Left", icon: AlignLeftIcon, className: "text-left" },
  { value: "justify", label: "Justify", icon: AlignJustifyIcon, className: "text-justify" },
  { value: "right", label: "Right", icon: AlignRightIcon, className: "text-right" },
]

/** Administrators can edit the oath text shown on /oath. */
export function OathEditor({ title, body, align: initialAlign }: OathInput) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const form = useForm<OathInput>({ resolver: zodResolver(oathSchema), defaultValues: { title, body, align: initialAlign } })
  const { errors, isSubmitting } = form.formState
  const align = useWatch({ control: form.control, name: "align" })

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
            <Textarea rows={12} className={ALIGN_OPTIONS.find((o) => o.value === align)?.className} {...form.register("body")} />
          </FormField>
          <div className="grid gap-1.5">
            <span id="oath_align_label" className="text-sm font-medium">Text alignment</span>
            <div className="flex w-max rounded-lg border bg-card p-0.5" role="radiogroup" aria-labelledby="oath_align_label">
              {ALIGN_OPTIONS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={align === value}
                  onClick={() => form.setValue("align", value, { shouldDirty: true })}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    align === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="size-4" aria-hidden /> {label}
                </button>
              ))}
            </div>
          </div>
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
