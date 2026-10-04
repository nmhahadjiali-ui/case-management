import {
  ActivityIcon,
  BriefcaseIcon,
  CalendarPlusIcon,
  CheckCircle2Icon,
  FileUpIcon,
  LogInIcon,
  MessageSquareIcon,
  PencilIcon,
  Trash2Icon,
  UserPlusIcon,
  type LucideIcon,
} from "lucide-react"
import { EmptyState } from "@/components/shared/empty-state"
import { formatDateTime, formatRelative } from "@/lib/datetime"
import { cn } from "@/lib/utils"
import type { ActivityLog } from "@/lib/types"

function iconFor(action: string): { icon: LucideIcon; className: string } {
  if (action.endsWith(".deleted") || action.endsWith(".removed")) return { icon: Trash2Icon, className: "bg-red-500/10 text-red-600 dark:text-red-400" }
  if (action === "task.completed") return { icon: CheckCircle2Icon, className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" }
  if (action.startsWith("hearing") || action.startsWith("event")) return { icon: CalendarPlusIcon, className: "bg-violet-500/10 text-violet-600 dark:text-violet-400" }
  if (action.startsWith("document")) return { icon: FileUpIcon, className: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400" }
  if (action.startsWith("note")) return { icon: MessageSquareIcon, className: "bg-amber-500/10 text-amber-600 dark:text-amber-400" }
  if (action.startsWith("person") || action.startsWith("party")) return { icon: UserPlusIcon, className: "bg-blue-500/10 text-blue-600 dark:text-blue-400" }
  if (action === "case.created") return { icon: BriefcaseIcon, className: "bg-primary/10 text-primary" }
  if (action === "user.login") return { icon: LogInIcon, className: "bg-muted text-muted-foreground" }
  if (action.endsWith(".updated") || action.endsWith("changed") || action.endsWith("assigned")) return { icon: PencilIcon, className: "bg-muted text-muted-foreground" }
  return { icon: ActivityIcon, className: "bg-muted text-muted-foreground" }
}

/** Audit-style timeline used on the dashboard and the case Activity tab. */
export function ActivityList({ items, compact = false }: { items: ActivityLog[]; compact?: boolean }) {
  if (!items.length) {
    return <EmptyState icon={ActivityIcon} title="No activity yet" description="Changes will be recorded here automatically." />
  }
  return (
    <ol className="relative grid gap-4">
      {items.map((item, i) => {
        const { icon: Icon, className } = iconFor(item.action)
        return (
          <li key={item.id} className="relative flex gap-3">
            {i < items.length - 1 && <span className="absolute top-8 bottom-[-1rem] left-[15px] w-px bg-border" aria-hidden />}
            <span className={cn("relative flex size-8 shrink-0 items-center justify-center rounded-full", className)}>
              <Icon className="size-4" aria-hidden />
            </span>
            <div className="min-w-0 pt-0.5">
              <p className={cn("text-sm", compact && "line-clamp-2")}>{item.description}</p>
              <p className="text-xs text-muted-foreground">
                {item.user?.full_name ?? "System"} ·{" "}
                <time suppressHydrationWarning dateTime={item.created_at} title={formatDateTime(item.created_at)}>
                  {formatRelative(item.created_at)}
                </time>
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
