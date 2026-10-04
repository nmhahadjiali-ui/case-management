"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2Icon, XIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { FormField } from "@/components/shared/form-field"
import { NativeSelect } from "@/components/shared/native-select"
import { PersonPicker } from "@/components/shared/person-picker"
import { FormError } from "@/components/auth/login-form"
import { createEvent, updateEvent } from "@/lib/actions/events"
import { eventSchema, type EventInput } from "@/lib/validations/event"
import { EVENT_STATUSES, EVENT_TYPES, REMINDER_OPTIONS } from "@/lib/constants"
import { dateKey, timeKey, todayKey } from "@/lib/datetime"
import type { CalendarEvent, CaseOption, PersonOption } from "@/lib/types"

type EventFormProps = {
  event?: CalendarEvent | null
  cases: CaseOption[]
  people: PersonOption[]
  defaults?: Partial<EventInput>
  onDone?: () => void
  onCancel?: () => void
}

export function EventForm({ event, cases, people, defaults, onDone, onCancel }: EventFormProps) {
  const router = useRouter()
  const [error, setError] = React.useState<string | null>(null)
  const [peopleOptions, setPeopleOptions] = React.useState(people)
  const [pickerKey, setPickerKey] = React.useState(0)

  const form = useForm<EventInput>({
    resolver: zodResolver(eventSchema),
    defaultValues: event
      ? {
          title: event.title,
          event_type: event.event_type,
          subtype: event.subtype ?? "",
          status: event.status,
          date: dateKey(event.starts_at),
          all_day: event.all_day,
          start_time: event.all_day ? "" : timeKey(event.starts_at),
          end_time: event.ends_at && !event.all_day ? timeKey(event.ends_at) : "",
          location: event.location ?? "",
          case_id: event.case_id ?? "",
          participant_ids: event.participants.map((p) => p.person.id),
          description: event.description ?? "",
          reminder_minutes: event.reminder_minutes === null ? "" : String(event.reminder_minutes),
        }
      : {
          title: "",
          event_type: "hearing",
          subtype: "",
          status: "scheduled",
          date: todayKey(),
          all_day: false,
          start_time: "09:00",
          end_time: "10:00",
          location: "",
          case_id: "",
          participant_ids: [],
          description: "",
          reminder_minutes: "60",
          ...defaults,
        },
  })
  const { errors, isSubmitting } = form.formState
  const allDay = form.watch("all_day")
  const participantIds = form.watch("participant_ids")
  const eventType = form.watch("event_type")

  async function onSubmit(values: EventInput) {
    setError(null)
    const res = event ? await updateEvent(event.id, values) : await createEvent(values)
    if (!res.ok) {
      setError(res.error)
      return
    }
    toast.success(res.message)
    if (onDone) {
      onDone()
      router.refresh()
    } else {
      router.push(`/calendar?date=${res.data!.date}`)
      router.refresh()
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.stopPropagation()
        void form.handleSubmit(onSubmit)(e)
      }}
      className="grid gap-4"
      noValidate
    >
      <FormError message={error} />
      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="Event title" htmlFor="ev_title" error={errors.title?.message} required className="sm:col-span-2">
          <Input {...form.register("title")} />
        </FormField>
        <FormField label="Event type" htmlFor="ev_type" error={errors.event_type?.message} required>
          <NativeSelect {...form.register("event_type")}>
            {EVENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </NativeSelect>
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="Date" htmlFor="ev_date" error={errors.date?.message} required>
          <Input type="date" {...form.register("date")} />
        </FormField>
        <FormField label="Start time" htmlFor="ev_start" error={errors.start_time?.message} required={!allDay}>
          <Input type="time" disabled={allDay} {...form.register("start_time")} />
        </FormField>
        <FormField label="End time" htmlFor="ev_end" error={errors.end_time?.message}>
          <Input type="time" disabled={allDay} {...form.register("end_time")} />
        </FormField>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id="ev_allday"
          checked={allDay}
          onCheckedChange={(v) => form.setValue("all_day", Boolean(v), { shouldValidate: true })}
        />
        <Label htmlFor="ev_allday">All-day event</Label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Location" htmlFor="ev_location" error={errors.location?.message}>
          <Input {...form.register("location")} />
        </FormField>
        <FormField label="Related case" htmlFor="ev_case" error={errors.case_id?.message}>
          <NativeSelect {...form.register("case_id")}>
            <option value="">None</option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>{c.case_number} — {c.title}</option>
            ))}
          </NativeSelect>
        </FormField>
        {eventType === "hearing" && (
          <FormField label="Hearing type" htmlFor="ev_subtype" error={errors.subtype?.message} description="e.g. Pre-trial, Mediation, Arraignment">
            <Input {...form.register("subtype")} />
          </FormField>
        )}
        <FormField label="Status" htmlFor="ev_status" error={errors.status?.message}>
          <NativeSelect {...form.register("status")}>
            {EVENT_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField label="Reminder" htmlFor="ev_reminder" error={errors.reminder_minutes?.message}>
          <NativeSelect {...form.register("reminder_minutes")}>
            {REMINDER_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </NativeSelect>
        </FormField>
      </div>

      <div className="grid gap-1.5">
        <Label>Participants</Label>
        {participantIds.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {participantIds.map((pid) => {
              const p = peopleOptions.find((o) => o.id === pid)
              return (
                <li key={pid} className="inline-flex items-center gap-1 rounded-full border bg-muted py-0.5 pr-1 pl-2.5 text-xs">
                  {p?.full_name ?? "Unknown"}
                  <button
                    type="button"
                    onClick={() => form.setValue("participant_ids", participantIds.filter((x) => x !== pid))}
                    className="rounded-full p-0.5 hover:bg-background"
                    aria-label={`Remove ${p?.full_name ?? "participant"}`}
                  >
                    <XIcon className="size-3" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        <div className="sm:max-w-sm">
          <PersonPicker
            key={pickerKey}
            options={peopleOptions}
            value=""
            exclude={participantIds}
            placeholder="Add a participant…"
            onChange={(p) => {
              if (!participantIds.includes(p.id)) form.setValue("participant_ids", [...participantIds, p.id])
              setPickerKey((k) => k + 1)
            }}
            onCreated={(p) => setPeopleOptions((o) => [...o, p])}
          />
        </div>
      </div>

      <FormField label="Description" htmlFor="ev_description" error={errors.description?.message}>
        <Textarea rows={3} {...form.register("description")} />
      </FormField>

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={() => (onCancel ? onCancel() : router.back())} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2Icon className="animate-spin" aria-hidden />}
          {event ? "Save changes" : "Create event"}
        </Button>
      </div>
    </form>
  )
}
