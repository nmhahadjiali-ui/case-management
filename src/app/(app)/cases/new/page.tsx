import type { Metadata } from "next"
import { Card, CardContent } from "@/components/ui/card"
import { PageHeader } from "@/components/shared/page-header"
import { CaseForm } from "@/components/cases/case-form"
import { requireRole } from "@/lib/auth"
import { getLookups, getPersonOptions } from "@/lib/data/lookups"
import { createClient } from "@/lib/supabase/server"
import { todayKey } from "@/lib/datetime"

export const metadata: Metadata = { title: "New Case" }

/** Suggest the next number in the "YYYY-NNN" sequence. */
async function suggestCaseNumber() {
  const year = todayKey().slice(0, 4)
  const supabase = await createClient()
  const { data } = await supabase
    .from("cases")
    .select("case_number")
    .like("case_number", `${year}-%`)
    .order("case_number", { ascending: false })
    .limit(1)
  const last = Number(data?.[0]?.case_number?.split("-")[1]) || 0
  return `${year}-${String(last + 1).padStart(3, "0")}`
}

export default async function NewCasePage() {
  await requireRole("administrator", "case_manager", "staff")
  const [lookups, people, suggested] = await Promise.all([getLookups(), getPersonOptions(), suggestCaseNumber()])

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader title="New Case" description="Record a new case, its parties and important dates." />
      <Card>
        <CardContent>
          <CaseForm lookups={lookups} people={people} suggestedNumber={suggested} />
        </CardContent>
      </Card>
    </div>
  )
}
