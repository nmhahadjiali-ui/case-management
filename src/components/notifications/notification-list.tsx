"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { BellOffIcon, CheckCheckIcon, CheckIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/shared/empty-state"
import { NOTIFICATION_ICONS } from "@/components/layout/notifications-menu"
import { useQueryParams } from "@/hooks/use-query-params"
import { deleteNotification, markAllNotificationsRead, markNotificationRead } from "@/lib/actions/notifications"
import { formatDateTime } from "@/lib/datetime"
import { cn } from "@/lib/utils"
import type { AppNotification } from "@/lib/types"

export function NotificationList({ items, filter }: { items: AppNotification[]; filter: "all" | "unread" }) {
  const router = useRouter()
  const { setParams } = useQueryParams()

  async function act(fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) {
    const res = await fn()
    if (!res.ok) toast.error(res.error)
    else {
      if (res.message) toast.success(res.message)
      router.refresh()
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex rounded-lg bg-muted p-1" role="group" aria-label="Filter notifications">
          {(["all", "unread"] as const).map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setParams({ filter: f === "all" ? "" : f })}
              className={cn(
                "rounded-md px-3 py-1 text-sm font-medium capitalize",
                filter === f ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={() => act(markAllNotificationsRead)}>
          <CheckCheckIcon /> Mark all as read
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={BellOffIcon} title={filter === "unread" ? "No unread notifications" : "No notifications yet"} />
      ) : (
        <ul className="divide-y">
          {items.map((n) => {
            const { icon: Icon, className } = NOTIFICATION_ICONS[n.type] ?? NOTIFICATION_ICONS.system
            return (
              <li key={n.id} className={cn("flex items-start gap-3 py-3", !n.is_read && "")}>
                <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", className)}>
                  <Icon className="size-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm", !n.is_read && "font-semibold")}>
                    {!n.is_read && <span className="mr-1.5 inline-block size-2 rounded-full bg-primary align-middle" aria-label="Unread" />}
                    {n.link ? (
                      <Link href={n.link} onClick={() => !n.is_read && markNotificationRead(n.id)} className="hover:underline">
                        {n.title}
                      </Link>
                    ) : (
                      n.title
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">{n.message}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{formatDateTime(n.created_at)}</p>
                </div>
                <div className="flex gap-1">
                  {!n.is_read && (
                    <Button variant="ghost" size="icon-sm" onClick={() => act(() => markNotificationRead(n.id))} aria-label="Mark as read">
                      <CheckIcon />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon-sm" onClick={() => act(() => deleteNotification(n.id))} aria-label="Delete notification">
                    <Trash2Icon />
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
