import type { Metadata } from "next"
import Link from "next/link"
import {
  AlertTriangleIcon,
  ArchiveIcon,
  BriefcaseIcon,
  CalendarClockIcon,
  CalendarPlusIcon,
  CheckCircle2Icon,
  ClockIcon,
  FilePlus2Icon,
  FolderOpenIcon,
  GavelIcon,
  HourglassIcon,
  ListChecksIcon,
  ListTodoIcon,
  SparklesIcon,
  UserPlusIcon,
} from "lucide-react"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/dashboard/stat-card"
import { CasesByTypeChart } from "@/components/dashboard/cases-chart"
import { AttentionList } from "@/components/dashboard/attention-card"
import { HearingsList } from "@/components/dashboard/hearings-list"
import { ActivityList } from "@/components/shared/activity-list"
import { CaseStatusBadge } from "@/components/shared/badges"
import { EmptyState } from "@/components/shared/empty-state"
import { DeniedToast } from "@/components/dashboard/denied-toast"
import { requireSession } from "@/lib/auth"
import { getDashboardData } from "@/lib/data/dashboard"
import { formatDate, formatRelative } from "@/lib/datetime"
import { canWrite } from "@/lib/permissions"

export const metadata: Metadata = { title: "Dashboard" }

function percentChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : null
  return Math.round(((current - previous) / previous) * 100)
}

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const [{ profile }, data, params] = await Promise.all([requireSession(), getDashboardData(), searchParams])
  const s = data.stats ?? {
    total: 0, active: 0, pending: 0, closed: 0, new: 0, overdue: 0, due_week: 0,
    filed_this_month: 0, filed_last_month: 0, upcoming_hearings: 0,
    tasks_due_today: 0, tasks_overdue: 0, tasks_completed: 0, tasks_upcoming: 0,
  }
  const writable = canWrite(profile.role)

  const cards = [
    { title: "Total Cases", value: s.total, description: "All non-archived cases", icon: BriefcaseIcon, href: "/cases", tone: "bg-primary/10 text-primary" },
    { title: "Active Cases", value: s.active, description: "Currently in progress", icon: FolderOpenIcon, href: "/cases?status=active", tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
    { title: "Pending Cases", value: s.pending, description: "Awaiting action", icon: HourglassIcon, href: "/cases?status=pending", tone: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
    { title: "Closed Cases", value: s.closed, description: "Resolved cases", icon: ArchiveIcon, href: "/cases?status=closed", tone: "bg-slate-500/10 text-slate-700 dark:text-slate-300" },
    {
      title: "New Cases", value: s.new, description: "Not yet acted on", icon: SparklesIcon, href: "/cases?status=new", tone: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
      change: percentChange(s.filed_this_month, s.filed_last_month), changeLabel: "filings vs last month",
    },
    { title: "Upcoming Hearings", value: s.upcoming_hearings, description: "Next 30 days", icon: GavelIcon, href: "/calendar?type=hearing", tone: "bg-violet-500/10 text-violet-700 dark:text-violet-400" },
    { title: "Overdue Cases", value: s.overdue, description: "Past their deadline", icon: AlertTriangleIcon, href: "/cases?due=overdue", tone: "bg-red-500/10 text-red-700 dark:text-red-400" },
    { title: "Due This Week", value: s.due_week, description: "Deadline within 7 days", icon: CalendarClockIcon, href: "/cases?due=week", tone: "bg-orange-500/10 text-orange-700 dark:text-orange-400" },
  ]

  const taskStats = [
    { label: "Due today", value: s.tasks_due_today, href: "/tasks?filter=today", icon: ClockIcon, tone: "text-orange-600 dark:text-orange-400" },
    { label: "Overdue", value: s.tasks_overdue, href: "/tasks?filter=overdue", icon: AlertTriangleIcon, tone: "text-red-600 dark:text-red-400" },
    { label: "Upcoming", value: s.tasks_upcoming, href: "/tasks?filter=pending", icon: ListTodoIcon, tone: "text-blue-600 dark:text-blue-400" },
    { label: "Completed", value: s.tasks_completed, href: "/tasks?filter=completed", icon: CheckCircle2Icon, tone: "text-emerald-600 dark:text-emerald-400" },
  ]

  const quickActions = [
    { label: "New Case", href: "/cases/new", icon: FilePlus2Icon },
    { label: "Add Person", href: "/people/new", icon: UserPlusIcon },
    { label: "New Event", href: "/calendar/new", icon: CalendarPlusIcon },
    { label: "New Task", href: "/tasks/new", icon: ListChecksIcon },
  ]

  return (
    <div className="space-y-6">
      <DeniedToast denied={params.denied === "1"} passwordUpdated={params.password === "updated"} />
      <PageHeader
        title="Dashboard"
        description="Overview of cases, hearings and tasks."
        actions={
          writable &&
          quickActions.map(({ label, href, icon: Icon }) => (
            <Link key={href} href={href} className={buttonVariants({ variant: label === "New Case" ? "default" : "outline" })}>
              <Icon aria-hidden /> {label}
            </Link>
          ))
        }
      />

      <section aria-label="Summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <StatCard key={c.title} {...c} />
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle>Cases by Type</CardTitle>
            <CardDescription>Number of non-archived cases in each category</CardDescription>
          </CardHeader>
          <CardContent>
            <CasesByTypeChart data={data.byType} />
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Cases Requiring Attention</CardTitle>
            <CardDescription>Overdue, upcoming or awaiting action</CardDescription>
          </CardHeader>
          <CardContent>
            <AttentionList items={data.attention} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Hearings</CardTitle>
            <CardDescription>Next scheduled hearings</CardDescription>
            <CardAction>
              <Link href="/calendar?type=hearing" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                View All
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent>
            <HearingsList hearings={data.hearings} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Cases</CardTitle>
            <CardDescription>Recently created or updated</CardDescription>
            <CardAction>
              <Link href="/cases" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                View All
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent>
            {data.recentCases.length === 0 ? (
              <EmptyState
                icon={BriefcaseIcon}
                title="No cases yet"
                action={writable && <Link href="/cases/new" className={buttonVariants({ size: "sm" })}>New Case</Link>}
              />
            ) : (
              <ul className="divide-y">
                {data.recentCases.map((c) => (
                  <li key={c.id}>
                    <Link href={`/cases/${c.id}`} className="flex items-center gap-3 rounded-md px-1 py-2.5 hover:bg-muted/50">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-muted-foreground">
                          {c.case_number} · {c.case_type_name}
                        </p>
                        <p className="truncate text-sm font-medium">{c.title}</p>
                        <p className="text-xs text-muted-foreground">Updated {formatRelative(c.updated_at)}</p>
                      </div>
                      <CaseStatusBadge status={c.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:col-span-2 lg:grid-cols-2 xl:col-span-1 xl:grid-cols-1">
          <Card>
            <CardHeader>
              <CardTitle>Task Overview</CardTitle>
              <CardDescription>As of {formatDate(new Date(), "long")}</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              {taskStats.map(({ label, value, href, icon: Icon, tone }) => (
                <Link key={label} href={href} className="rounded-lg border p-3 transition-colors hover:bg-muted/50">
                  <Icon className={`size-4 ${tone}`} aria-hidden />
                  <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest changes across the system</CardDescription>
            </CardHeader>
            <CardContent>
              <ActivityList items={data.activity} compact />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
