import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { PageHeader } from "@/components/shared/page-header"
import { PersonForm } from "@/components/people/person-form"
import { requireRole } from "@/lib/auth"
import { getPerson } from "@/lib/data/people"

export const metadata: Metadata = { title: "Edit Person" }

export default async function EditPersonPage({ params }: PageProps<"/people/[id]/edit">) {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  await requireRole("administrator", "case_manager", "staff")
  const person = await getPerson(id)
  if (!person) notFound()

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title={`Edit ${person.full_name}`} />
      <Card>
        <CardContent>
          <PersonForm person={person} />
        </CardContent>
      </Card>
    </div>
  )
}
