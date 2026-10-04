import type { Metadata } from "next"
import { Card, CardContent } from "@/components/ui/card"
import { PageHeader } from "@/components/shared/page-header"
import { PersonForm } from "@/components/people/person-form"
import { requireRole } from "@/lib/auth"

export const metadata: Metadata = { title: "Add Person" }

export default async function NewPersonPage() {
  await requireRole("administrator", "case_manager", "staff")
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Add Person" description="Record a person who is or may become involved in a case." />
      <Card>
        <CardContent>
          <PersonForm />
        </CardContent>
      </Card>
    </div>
  )
}
