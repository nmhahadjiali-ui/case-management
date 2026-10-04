import type { Metadata } from "next"
import { Card, CardContent } from "@/components/ui/card"
import { PageHeader } from "@/components/shared/page-header"
import { Pagination } from "@/components/shared/pagination"
import { NotificationList } from "@/components/notifications/notification-list"
import { requireSession } from "@/lib/auth"
import { listNotifications } from "@/lib/data/notifications"

export const metadata: Metadata = { title: "Notifications" }

const PAGE_SIZE = 25

export default async function NotificationsPage({ searchParams }: PageProps<"/notifications">) {
  await requireSession()
  const params = await searchParams
  const filter = params.filter === "unread" ? "unread" : "all"
  const page = Math.max(1, Number(params.page) || 1)
  const { items, total } = await listNotifications(filter, page, PAGE_SIZE)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Notifications" description="Hearing reminders, deadlines, task assignments and case updates." />
      <Card>
        <CardContent>
          <NotificationList items={items} filter={filter} />
        </CardContent>
      </Card>
      <Pagination page={page} perPage={PAGE_SIZE} total={total} showPageSize={false} />
    </div>
  )
}
