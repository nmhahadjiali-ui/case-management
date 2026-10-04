"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2Icon, MonitorIcon, MoonIcon, PanelLeftCloseIcon, PanelLeftOpenIcon, SunIcon, type LucideIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { FormField } from "@/components/shared/form-field"
import { NativeSelect } from "@/components/shared/native-select"
import { setSidebarCollapsed, updateCalendarPrefs, updateNotificationPrefs } from "@/lib/actions/settings"
import {
  calendarPrefsSchema,
  notificationPrefsSchema,
  type CalendarPrefsInput,
  type NotificationPrefsInput,
} from "@/lib/validations/settings"
import { REMINDER_OPTIONS } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { useMounted } from "@/hooks/use-mounted"
import type { UserSettings } from "@/lib/types"

function ChoiceCard({
  selected,
  onClick,
  icon: Icon,
  label,
}: {
  selected: boolean
  onClick: () => void
  icon: LucideIcon
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex flex-col items-center gap-2 rounded-lg border p-4 text-sm font-medium transition-colors outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50",
        selected && "border-primary bg-primary/5 text-primary"
      )}
    >
      <Icon className="size-5" aria-hidden />
      {label}
    </button>
  )
}

export function AppearanceForm({ sidebarCollapsed }: { sidebarCollapsed: boolean }) {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const mounted = useMounted() // the theme is only known in the browser
  const [collapsed, setCollapsed] = React.useState(sidebarCollapsed)

  async function chooseSidebar(value: boolean) {
    setCollapsed(value)
    await setSidebarCollapsed(value)
    toast.success("Sidebar preference saved.")
    router.refresh()
  }

  return (
    <div className="grid gap-8">
      <div className="grid gap-3">
        <div>
          <p className="text-sm font-medium">Theme</p>
          <p className="text-xs text-muted-foreground">Choose light, dark, or follow your device setting.</p>
        </div>
        <div className="grid max-w-md grid-cols-3 gap-3">
          {([
            ["light", "Light", SunIcon],
            ["dark", "Dark", MoonIcon],
            ["system", "System", MonitorIcon],
          ] as const).map(([value, label, icon]) => (
            <ChoiceCard key={value} selected={mounted && theme === value} onClick={() => setTheme(value)} icon={icon} label={label} />
          ))}
        </div>
      </div>
      <div className="grid gap-3">
        <div>
          <p className="text-sm font-medium">Sidebar</p>
          <p className="text-xs text-muted-foreground">Default state of the navigation sidebar on large screens.</p>
        </div>
        <div className="grid max-w-xs grid-cols-2 gap-3">
          <ChoiceCard selected={!collapsed} onClick={() => chooseSidebar(false)} icon={PanelLeftOpenIcon} label="Expanded" />
          <ChoiceCard selected={collapsed} onClick={() => chooseSidebar(true)} icon={PanelLeftCloseIcon} label="Collapsed" />
        </div>
      </div>
    </div>
  )
}

const NOTIFICATION_FIELDS: { name: keyof NotificationPrefsInput; label: string; description: string }[] = [
  { name: "in_app_notifications", label: "In-app notifications", description: "Show notifications in the bell menu. Turning this off mutes everything below." },
  { name: "hearing_reminders", label: "Hearing reminders", description: "Upcoming hearings on your cases within 48 hours." },
  { name: "deadline_reminders", label: "Deadline reminders", description: "Case deadlines within 3 days and event reminders." },
  { name: "task_reminders", label: "Task reminders", description: "New assignments, tasks due today and overdue tasks." },
  { name: "case_updates", label: "Case updates", description: "New cases, assignments and status changes." },
  { name: "email_notifications", label: "Email notifications", description: "Also send notifications by email (requires email delivery to be configured)." },
]

export function NotificationPrefsForm({ settings }: { settings: NotificationPrefsInput }) {
  const form = useForm<NotificationPrefsInput>({ resolver: zodResolver(notificationPrefsSchema), defaultValues: settings })
  const { isSubmitting, isDirty } = form.formState
  const values = form.watch()

  async function onSubmit(v: NotificationPrefsInput) {
    const res = await updateNotificationPrefs(v)
    if (!res.ok) toast.error(res.error)
    else {
      toast.success(res.message)
      form.reset(v)
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-1" noValidate>
      <ul className="divide-y">
        {NOTIFICATION_FIELDS.map((f) => {
          const disabled = f.name !== "in_app_notifications" && f.name !== "email_notifications" && !values.in_app_notifications
          return (
            <li key={f.name} className="flex items-center justify-between gap-4 py-3">
              <div>
                <Label htmlFor={f.name} className={cn(disabled && "opacity-50")}>{f.label}</Label>
                <p className="text-xs text-muted-foreground">{f.description}</p>
              </div>
              <Switch
                id={f.name}
                checked={values[f.name]}
                disabled={disabled}
                onCheckedChange={(v) => form.setValue(f.name, v, { shouldDirty: true })}
              />
            </li>
          )
        })}
      </ul>
      <div className="pt-3">
        <Button type="submit" disabled={isSubmitting || !isDirty}>
          {isSubmitting && <Loader2Icon className="animate-spin" aria-hidden />} Save preferences
        </Button>
      </div>
    </form>
  )
}

export function CalendarPrefsForm({ settings, timezone }: { settings: UserSettings; timezone: string }) {
  const form = useForm<CalendarPrefsInput>({
    resolver: zodResolver(calendarPrefsSchema),
    defaultValues: {
      default_calendar_view: settings.default_calendar_view,
      working_hours_start: settings.working_hours_start.slice(0, 5),
      working_hours_end: settings.working_hours_end.slice(0, 5),
      default_reminder_minutes: String(settings.default_reminder_minutes),
    },
  })
  const { errors, isSubmitting, isDirty } = form.formState

  async function onSubmit(v: CalendarPrefsInput) {
    const res = await updateCalendarPrefs(v)
    if (!res.ok) toast.error(res.error)
    else {
      toast.success(res.message)
      form.reset(v)
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid max-w-xl gap-4" noValidate>
      <FormField label="Default calendar view" htmlFor="default_calendar_view" error={errors.default_calendar_view?.message}>
        <NativeSelect {...form.register("default_calendar_view")}>
          <option value="month">Month</option>
          <option value="week">Week</option>
          <option value="day">Day</option>
        </NativeSelect>
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Working hours start" htmlFor="working_hours_start" error={errors.working_hours_start?.message}>
          <Input type="time" {...form.register("working_hours_start")} />
        </FormField>
        <FormField label="Working hours end" htmlFor="working_hours_end" error={errors.working_hours_end?.message}>
          <Input type="time" {...form.register("working_hours_end")} />
        </FormField>
      </div>
      <FormField label="Default event reminder" htmlFor="default_reminder_minutes" error={errors.default_reminder_minutes?.message}>
        <NativeSelect {...form.register("default_reminder_minutes")}>
          {REMINDER_OPTIONS.filter((r) => r.value !== "").map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
          <option value="0">At start time</option>
        </NativeSelect>
      </FormField>
      <FormField label="Time zone" htmlFor="tz" description="Set organisation-wide by the NEXT_PUBLIC_APP_TIMEZONE environment variable.">
        <Input value={timezone} readOnly disabled />
      </FormField>
      <div>
        <Button type="submit" disabled={isSubmitting || !isDirty}>
          {isSubmitting && <Loader2Icon className="animate-spin" aria-hidden />} Save preferences
        </Button>
      </div>
    </form>
  )
}
