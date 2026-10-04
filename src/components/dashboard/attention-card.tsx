import Link from "next/link"
import { ShieldCheckIcon } from "lucide-react"
import { CaseStatusBadge } from "@/components/shared/badges"
import { EmptyState } from "@/components/shared/empty-state"
import { formatDate } from "@/lib/datetime"
import { cn } from "@/lib/utils"
import type { AttentionItem, AttentionReason } from "@/lib/data/dashboard"

export const ATTENTION_STYLE: Record<AttentionReason, { label: string; dot: string; text: string }> = {
  overdue: { label: "Overdue", dot: "bg-red-500", text: "text-red-700 dark:text-red-400" },
  hearing_soon: { label: "Hearing Soon", dot: "bg-orange-500", text: "text-orange-700 dark:text-orange-400" },
  deadline: { label: "Deadline Approaching", dot: "bg-yellow-500", text: "text-yellow-700 dark:text-yellow-400" },
  pending: { label: "Pending Action", dot: "bg-blue-500", text: "text-blue-700 dark:text-blue-400" },
  updated: { label: "Updated", dot: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-400" },
}

export function AttentionList({ items }: { items: AttentionItem[] }) {
  if (!items.length) {
    return <EmptyState icon={ShieldCheckIcon} title="Nothing needs attention" description="No overdue cases, upcoming hearings or pending actions." />
  }
  return (
    <ul className="divide-y">
      {items.map((item) => {
        const style = ATTENTION_STYLE[item.reason]
        return (
          <li key={item.case.id}>
            <Link
              href={`/cases/${item.case.id}`}
              className="flex items-start gap-3 rounded-md px-1 py-3 outline-none hover:bg-muted/50 focus-visible:bg-muted/50"
            >
              <span className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", style.dot)} aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2">
                  <span className="text-xs font-semibold text-muted-foreground">{item.case.case_number}</span>
                  <span className={cn("text-xs font-medium", style.text)}>{style.label}</span>
                </div>
                <p className="truncate text-sm font-medium">{item.case.title}</p>
                <p className="text-xs text-muted-foreground">
                  {item.label} · {formatDate(item.date)}
                </p>
              </div>
              <CaseStatusBadge status={item.case.status} />
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
