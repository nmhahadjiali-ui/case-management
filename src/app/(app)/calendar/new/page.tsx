import type { Metadata } from "next"
import { Card, CardContent } from "@/components/ui/card"
import { PageHeader } from "@/components/shared/page-header"
import { EventForm } from "@/components/calendar/event-form"
import { requireRole } from "@/lib/auth"
import { getCaseOptions, getPersonOptions } from "@/lib/data/lookups"
import { createClient } from "@/lib/supabase/server"
import { EVENT_TYPES, type EventType } from "@/lib/constants"
import { isValidDateKey } from "@/lib/datetime"

export const metadata: Metadata = { title: "New Event" }

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ""

export default async function NewEventPage({ searchParams }: PageProps<"/calendar/new">) {
  const session = await requireRole("administrator", "case_manager", "staff")
  const params = await searchParams
  const [cases, people] = await Promise.all([getCaseOptions(), getPersonOptions()])

  const supabase = await createClient()
  const { data: settings } = await supabase
    .from("user_settings")
    .select("default_reminder_minutes")
    .eq("user_id", session.userId)
    .maybeSingle()

  const caseId = one(params.case)
  const type = one(params.type)
  const date = one(params.date)
  const linkedCase = cases.find((c) => c.id === caseId)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="New Event" description="Schedule a hearing, conference, deadline or appointment." />
      <Card>
        <CardContent>
          <EventForm
            cases={cases}
            people={people}
            defaults={{
              ...(isValidDateKey(date) ? { date } : {}),
              ...(EVENT_TYPES.some((t) => t.value === type) ? { event_type: type as EventType } : {}),
              ...(linkedCase ? { case_id: linkedCase.id, title: `Hearing — ${linkedCase.case_number}` } : {}),
              ...(settings ? { reminder_minutes: String(settings.default_reminder_minutes) } : {}),
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
