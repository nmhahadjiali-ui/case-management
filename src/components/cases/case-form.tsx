"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useFieldArray, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2Icon, PlusIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { FormField, FormSection } from "@/components/shared/form-field"
import { NativeSelect } from "@/components/shared/native-select"
import { PersonPicker } from "@/components/shared/person-picker"
import { FormError } from "@/components/auth/login-form"
import { createCase, updateCase } from "@/lib/actions/cases"
import { caseSchema, type CaseInput } from "@/lib/validations/case"
import { CASE_PRIORITIES, CASE_STATUSES, PARTY_ROLES } from "@/lib/constants"
import { formatDateTime, todayKey } from "@/lib/datetime"
import type { CaseListItem, Lookups, PersonOption } from "@/lib/types"

type CaseFormProps = {
  lookups: Lookups
  people: PersonOption[]
  existing?: {
    case: CaseListItem
    parties: { person_id: string; role: CaseInput["parties"][number]["role"] }[]
    tags: string[]
  }
  suggestedNumber?: string
}

export function CaseForm({ lookups, people, existing, suggestedNumber }: CaseFormProps) {
  const router = useRouter()
  const [error, setError] = React.useState<string | null>(null)
  const [personOptions, setPersonOptions] = React.useState(people)
  const c = existing?.case

  const form = useForm<CaseInput>({
    // Blank party rows are ignored rather than reported, so users can leave spare rows empty.
    resolver: (values, context, options) =>
      zodResolver(caseSchema)({ ...values, parties: values.parties.filter((p) => p.person_id) }, context, options),
    defaultValues: {
      case_number: c?.case_number ?? suggestedNumber ?? "",
      title: c?.title ?? "",
      case_type_id: c?.case_type_id ?? "",
      description: c?.description ?? "",
      date_filed: c?.date_filed ?? todayKey(),
      status: c?.status ?? "new",
      priority: c?.priority ?? "normal",
      assigned_to: c?.assigned_to ?? "",
      department_id: c?.department_id ?? "",
      location_id: c?.location_id ?? "",
      deadline: c?.deadline ?? "",
      resolution_date: c?.resolution_date ?? "",
      next_hearing_date: "",
      next_hearing_time: "",
      notes: "",
      tags: existing?.tags.join(", ") ?? "",
      parties: existing?.parties ?? [
        { person_id: "", role: "complainant" },
        { person_id: "", role: "defendant" },
      ],
    },
  })
  const { errors, isSubmitting } = form.formState
  const parties = useFieldArray({ control: form.control, name: "parties" })
  const watchedParties = form.watch("parties")

  async function onSubmit(values: CaseInput) {
    setError(null)
    const res = c ? await updateCase(c.id, values) : await createCase(values)
    if (!res.ok) {
      setError(res.error)
      for (const [field, msgs] of Object.entries(res.fieldErrors ?? {})) {
        form.setError(field as keyof CaseInput, { message: msgs[0] })
      }
      return
    }
    toast.success(res.message)
    router.push(`/cases/${res.data!.id}`)
    router.refresh()
  }

  const partiesError = errors.parties?.message ?? errors.parties?.root?.message

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6" noValidate>
      <FormError message={error} />

      <FormSection title="Basic information">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormField label="Case number" htmlFor="case_number" error={errors.case_number?.message} required>
            <Input placeholder="2026-001" autoComplete="off" {...form.register("case_number")} />
          </FormField>
          <FormField label="Case title" htmlFor="title" error={errors.title?.message} required className="lg:col-span-2">
            <Input placeholder="e.g. Recovery of unpaid loan" {...form.register("title")} />
          </FormField>
          <FormField label="Case type" htmlFor="case_type_id" error={errors.case_type_id?.message} required>
            <NativeSelect {...form.register("case_type_id")}>
              <option value="">Select a type…</option>
              {lookups.caseTypes.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </NativeSelect>
          </FormField>
          <FormField label="Status" htmlFor="status" error={errors.status?.message} required>
            <NativeSelect {...form.register("status")}>
              {CASE_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </NativeSelect>
          </FormField>
          <FormField label="Priority" htmlFor="priority" error={errors.priority?.message} required>
            <NativeSelect {...form.register("priority")}>
              {CASE_PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </NativeSelect>
          </FormField>
          <FormField label="Description" htmlFor="description" error={errors.description?.message} className="sm:col-span-2 lg:col-span-3">
            <Textarea rows={4} placeholder="Summary of the case" {...form.register("description")} />
          </FormField>
        </div>
      </FormSection>

      <FormSection title="Parties" description="Select existing people or create new ones. At least one complainant is required.">
        <div className="grid gap-3">
          {parties.fields.map((field, index) => (
            <div key={field.id} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[180px_1fr_auto] sm:items-start sm:border-0 sm:p-0">
              <NativeSelect aria-label={`Role of party ${index + 1}`} {...form.register(`parties.${index}.role`)}>
                {PARTY_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </NativeSelect>
              <div className="grid gap-1">
                <PersonPicker
                  options={personOptions}
                  value={watchedParties[index]?.person_id ?? ""}
                  defaultRole={watchedParties[index]?.role}
                  invalid={!!errors.parties?.[index]?.person_id}
                  onChange={(p) => form.setValue(`parties.${index}.person_id`, p.id, { shouldValidate: true, shouldDirty: true })}
                  onCreated={(p) => setPersonOptions((prev) => [...prev, p].sort((a, b) => a.full_name.localeCompare(b.full_name)))}
                />
                {errors.parties?.[index]?.person_id && (
                  <p className="text-xs font-medium text-destructive">Choose a person</p>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => parties.remove(index)}
                aria-label={`Remove party ${index + 1}`}
              >
                <Trash2Icon />
              </Button>
            </div>
          ))}
          {partiesError && (
            <p role="alert" className="text-xs font-medium text-destructive">{partiesError}</p>
          )}
          <div>
            <Button type="button" variant="outline" size="sm" onClick={() => parties.append({ person_id: "", role: "witness" })}>
              <PlusIcon /> Add party
            </Button>
          </div>
        </div>
      </FormSection>

      <FormSection title="Assignment">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Assigned staff" htmlFor="assigned_to" error={errors.assigned_to?.message}>
            <NativeSelect {...form.register("assigned_to")}>
              <option value="">Unassigned</option>
              {lookups.staff.map((s) => (
                <option key={s.id} value={s.id}>{s.full_name}</option>
              ))}
            </NativeSelect>
          </FormField>
          <FormField label="Department / Office" htmlFor="department_id" error={errors.department_id?.message}>
            <NativeSelect {...form.register("department_id")}>
              <option value="">None</option>
              {lookups.departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </NativeSelect>
          </FormField>
        </div>
      </FormSection>

      <FormSection title="Important dates">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FormField label="Filing date" htmlFor="date_filed" error={errors.date_filed?.message} required>
            <Input type="date" {...form.register("date_filed")} />
          </FormField>
          <FormField label="Deadline" htmlFor="deadline" error={errors.deadline?.message}>
            <Input type="date" {...form.register("deadline")} />
          </FormField>
          <FormField label="Resolution date" htmlFor="resolution_date" error={errors.resolution_date?.message}>
            <Input type="date" {...form.register("resolution_date")} />
          </FormField>
          <div className="hidden lg:block" />
          <FormField
            label={c ? "Schedule another hearing" : "Next hearing"}
            htmlFor="next_hearing_date"
            error={errors.next_hearing_date?.message}
            description={
              c?.next_hearing
                ? `Currently scheduled: ${formatDateTime(c.next_hearing)}`
                : "Creates a hearing on the calendar"
            }
          >
            <Input type="date" {...form.register("next_hearing_date")} />
          </FormField>
          <FormField label="Hearing time" htmlFor="next_hearing_time" error={errors.next_hearing_time?.message}>
            <Input type="time" {...form.register("next_hearing_time")} />
          </FormField>
        </div>
      </FormSection>

      <FormSection title="Location">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Court / Office" htmlFor="location_id" error={errors.location_id?.message}>
            <NativeSelect {...form.register("location_id")}>
              <option value="">Not set</option>
              {lookups.locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </NativeSelect>
          </FormField>
        </div>
      </FormSection>

      <FormSection title="Additional information">
        <div className="grid gap-4 sm:grid-cols-2">
          {!c && (
            <FormField label="Notes" htmlFor="notes" error={errors.notes?.message} className="sm:col-span-2">
              <Textarea rows={3} placeholder="Initial note (optional)" {...form.register("notes")} />
            </FormField>
          )}
          <FormField label="Tags" htmlFor="tags" error={errors.tags?.message} description="Separate tags with commas">
            <Input placeholder="mediation, appeal" {...form.register("tags")} />
          </FormField>
        </div>
      </FormSection>

      <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
        <Link href={c ? `/cases/${c.id}` : "/cases"} className={buttonVariants({ variant: "outline" })}>
          Cancel
        </Link>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2Icon className="animate-spin" aria-hidden />}
          {c ? "Save changes" : "Create case"}
        </Button>
      </div>
    </form>
  )
}
