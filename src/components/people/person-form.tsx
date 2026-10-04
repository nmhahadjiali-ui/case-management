"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2Icon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { FormField, FormSection } from "@/components/shared/form-field"
import { NativeSelect } from "@/components/shared/native-select"
import { FormError } from "@/components/auth/login-form"
import { createPerson, updatePerson } from "@/lib/actions/people"
import { personSchema, type PersonInput } from "@/lib/validations/person"
import { GENDERS, PARTY_ROLES, type PartyRole } from "@/lib/constants"
import type { Person, PersonOption } from "@/lib/types"

export function personToForm(p?: Person | null, defaultRole: PartyRole = "complainant"): PersonInput {
  return {
    first_name: p?.first_name ?? "",
    middle_name: p?.middle_name ?? "",
    last_name: p?.last_name ?? "",
    suffix: p?.suffix ?? "",
    primary_role: p?.primary_role ?? defaultRole,
    gender: (p?.gender as PersonInput["gender"]) ?? "",
    date_of_birth: p?.date_of_birth ?? "",
    address: p?.address ?? "",
    contact_number: p?.contact_number ?? "",
    email: p?.email ?? "",
    occupation: p?.occupation ?? "",
    is_active: p?.is_active ?? true,
  }
}

type PersonFormProps = {
  person?: Person | null
  defaultRole?: PartyRole
  /** "page": navigate after saving. "dialog": call onSaved and stay put (compact layout). */
  mode?: "page" | "dialog"
  onSaved?: (person: PersonOption) => void
  onCancel?: () => void
}

export function PersonForm({ person, defaultRole, mode = "page", onSaved, onCancel }: PersonFormProps) {
  const router = useRouter()
  const [error, setError] = React.useState<string | null>(null)
  const form = useForm<PersonInput>({
    resolver: zodResolver(personSchema),
    defaultValues: personToForm(person, defaultRole),
  })
  const { errors, isSubmitting } = form.formState
  const isActive = form.watch("is_active")

  async function onSubmit(values: PersonInput) {
    setError(null)
    if (person) {
      const res = await updatePerson(person.id, values)
      if (!res.ok) return handleError(res)
      toast.success("Person updated.")
      router.push(`/people/${person.id}`)
      router.refresh()
      return
    }
    const res = await createPerson(values)
    if (!res.ok) return handleError(res)
    toast.success(`${res.data!.full_name} added.`)
    if (mode === "dialog") {
      onSaved?.(res.data!)
      form.reset(personToForm(null, defaultRole))
    } else {
      router.push(`/people/${res.data!.id}`)
      router.refresh()
    }
  }

  function handleError(res: { error: string; fieldErrors?: Record<string, string[]> }) {
    setError(res.error)
    for (const [field, msgs] of Object.entries(res.fieldErrors ?? {})) {
      form.setError(field as keyof PersonInput, { message: msgs[0] })
    }
  }

  const compact = mode === "dialog"
  const grid = compact ? "grid gap-3 sm:grid-cols-2" : "grid gap-4 sm:grid-cols-2 lg:grid-cols-4"

  return (
    <form
      onSubmit={(e) => {
        // Keep a dialog form from submitting a parent form.
        e.stopPropagation()
        void form.handleSubmit(onSubmit)(e)
      }}
      className="grid gap-6"
      noValidate
    >
      <FormError message={error} />
      <FormSection title="Name">
        <div className={grid}>
          <FormField label="First name" htmlFor="first_name" error={errors.first_name?.message} required>
            <Input autoComplete="off" {...form.register("first_name")} />
          </FormField>
          <FormField label="Middle name" htmlFor="middle_name" error={errors.middle_name?.message}>
            <Input autoComplete="off" {...form.register("middle_name")} />
          </FormField>
          <FormField label="Last name" htmlFor="last_name" error={errors.last_name?.message} required>
            <Input autoComplete="off" {...form.register("last_name")} />
          </FormField>
          <FormField label="Suffix" htmlFor="suffix" error={errors.suffix?.message}>
            <Input placeholder="Jr., Sr., III" autoComplete="off" {...form.register("suffix")} />
          </FormField>
        </div>
      </FormSection>

      <FormSection title="Details">
        <div className={grid}>
          <FormField label="Primary role" htmlFor="primary_role" error={errors.primary_role?.message} required>
            <NativeSelect {...form.register("primary_role")}>
              {PARTY_ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </NativeSelect>
          </FormField>
          <FormField label="Gender" htmlFor="gender" error={errors.gender?.message}>
            <NativeSelect {...form.register("gender")}>
              <option value="">Not specified</option>
              {GENDERS.map((g) => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </NativeSelect>
          </FormField>
          <FormField label="Date of birth" htmlFor="date_of_birth" error={errors.date_of_birth?.message}>
            <Input type="date" {...form.register("date_of_birth")} />
          </FormField>
          <FormField label="Occupation" htmlFor="occupation" error={errors.occupation?.message}>
            <Input {...form.register("occupation")} />
          </FormField>
        </div>
      </FormSection>

      <FormSection title="Contact">
        <div className={compact ? "grid gap-3 sm:grid-cols-2" : "grid gap-4 sm:grid-cols-2"}>
          <FormField label="Contact number" htmlFor="contact_number" error={errors.contact_number?.message}>
            <Input type="tel" autoComplete="off" {...form.register("contact_number")} />
          </FormField>
          <FormField label="Email" htmlFor="person_email" error={errors.email?.message}>
            <Input type="email" autoComplete="off" {...form.register("email")} />
          </FormField>
          <FormField label="Address" htmlFor="address" error={errors.address?.message} className="sm:col-span-2">
            <Textarea rows={2} {...form.register("address")} />
          </FormField>
        </div>
        {!compact && (
          <div className="flex items-center gap-3">
            <Switch
              id="is_active"
              checked={isActive}
              onCheckedChange={(v) => form.setValue("is_active", v, { shouldDirty: true })}
            />
            <Label htmlFor="is_active">Active</Label>
            <span className="text-xs text-muted-foreground">Inactive people are kept for history but hidden from pickers.</span>
          </div>
        )}
      </FormSection>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={() => (onCancel ? onCancel() : router.back())} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2Icon className="animate-spin" aria-hidden />}
          {person ? "Save changes" : "Add person"}
        </Button>
      </div>
    </form>
  )
}
