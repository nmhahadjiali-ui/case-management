import type { Metadata } from "next"
import { ScrollTextIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { OathEditor } from "@/components/settings/oath-editor"
import { requireSession } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { isAdmin } from "@/lib/permissions"
import { formatDate } from "@/lib/datetime"
import { cn } from "@/lib/utils"
import { OATH_ALIGNMENTS, type OathAlign } from "@/lib/validations/settings"

export const metadata: Metadata = { title: "Oath" }

const ALIGN_CLASS: Record<OathAlign, string> = {
  center: "text-center",
  left: "text-left",
  justify: "text-justify",
  right: "text-right",
}

export default async function OathPage() {
  const session = await requireSession()
  const supabase = await createClient()
  const { data } = await supabase.from("app_settings").select("value, updated_at").eq("key", "oath").maybeSingle()
  const oath = (data?.value as { title?: string; body?: string; align?: OathAlign } | undefined) ?? {}
  const title = oath.title ?? "Oath of Service"
  const body = oath.body ?? ""
  const align: OathAlign = OATH_ALIGNMENTS.includes(oath.align as OathAlign) ? oath.align! : "center"

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card>
        <CardContent className="space-y-6 px-6 py-8 sm:px-12 sm:py-12">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ScrollTextIcon className="size-6" aria-hidden />
            </div>
            <h1 className="font-serif text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
            <div className="h-px w-16 bg-border" aria-hidden />
          </div>
          <div className={cn("space-y-4 font-serif text-base leading-relaxed sm:text-lg", ALIGN_CLASS[align])}>
            {body ? (
              body.split(/\n{2,}/).map((p, i) => <p key={i} dir="auto">{p}</p>)
            ) : (
              <p className="text-center text-muted-foreground">No oath text has been set.</p>
            )}
          </div>
          {data?.updated_at && (
            <p className="text-center text-xs text-muted-foreground">Last updated {formatDate(data.updated_at, "long")}</p>
          )}
        </CardContent>
      </Card>
      {isAdmin(session.profile.role) && <OathEditor title={title} body={body} align={align} />}
    </div>
  )
}
