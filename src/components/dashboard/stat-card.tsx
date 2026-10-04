import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { ArrowDownRightIcon, ArrowUpRightIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export type StatCardProps = {
  title: string
  value: number
  description: string
  icon: LucideIcon
  href: string
  /** Tailwind classes for the icon chip */
  tone: string
  /** Optional % change vs. a previous period */
  change?: number | null
  changeLabel?: string
}

export function StatCard({ title, value, description, icon: Icon, href, tone, change, changeLabel }: StatCardProps) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 transition-shadow outline-none hover:shadow-md hover:ring-foreground/20 focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", tone)}>
          <Icon className="size-4" aria-hidden />
        </span>
      </div>
      <p className="text-3xl font-semibold tracking-tight tabular-nums">{value.toLocaleString()}</p>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        {change !== undefined && change !== null && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 font-medium",
              change >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"
            )}
          >
            {change >= 0 ? <ArrowUpRightIcon className="size-3" aria-hidden /> : <ArrowDownRightIcon className="size-3" aria-hidden />}
            {Math.abs(change)}%
            <span className="sr-only">{change >= 0 ? "increase" : "decrease"}</span>
            {changeLabel && <span className="font-normal text-muted-foreground">{changeLabel}</span>}
          </span>
        )}
        <span>{description}</span>
      </div>
    </Link>
  )
}
