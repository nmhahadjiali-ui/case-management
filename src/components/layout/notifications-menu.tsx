"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  BellIcon,
  BriefcaseIcon,
  CalendarClockIcon,
  CheckCheckIcon,
  CheckSquareIcon,
  GavelIcon,
  InfoIcon,
  type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { createClient } from "@/lib/supabase/client"
import { markAllNotificationsRead, markNotificationRead } from "@/lib/actions/notifications"
import { formatRelative } from "@/lib/datetime"
import { cn } from "@/lib/utils"
import type { AppNotification, NotificationType } from "@/lib/types"

export const NOTIFICATION_ICONS: Record<NotificationType, { icon: LucideIcon; className: string }> = {
  hearing: { icon: GavelIcon, className: "bg-violet-500/10 text-violet-600 dark:text-violet-300" },
  task: { icon: CheckSquareIcon, className: "bg-blue-500/10 text-blue-600 dark:text-blue-300" },
  deadline: { icon: CalendarClockIcon, className: "bg-red-500/10 text-red-600 dark:text-red-300" },
  case: { icon: BriefcaseIcon, className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" },
  system: { icon: InfoIcon, className: "bg-muted text-muted-foreground" },
}

export function NotificationsMenu({
  userId,
  initialItems,
  initialUnread,
}: {
  userId: string
  initialItems: AppNotification[]
  initialUnread: number
}) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [items, setItems] = React.useState(initialItems)
  const [unread, setUnread] = React.useState(initialUnread)

  // Server data wins whenever the layout re-renders with new props.
  const [prevInitial, setPrevInitial] = React.useState(initialItems)
  if (prevInitial !== initialItems) {
    setPrevInitial(initialItems)
    setItems(initialItems)
    setUnread(initialUnread)
  }

  // Live updates: new notifications appear without a page reload.
  React.useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          const n = payload.new as AppNotification
          setItems((prev) => [n, ...prev.filter((p) => p.id !== n.id)].slice(0, 15))
          setUnread((u) => u + 1)
          toast(n.title, { description: n.message })
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  async function markRead(n: AppNotification) {
    if (n.is_read) return
    setItems((prev) => prev.map((p) => (p.id === n.id ? { ...p, is_read: true } : p)))
    setUnread((u) => Math.max(0, u - 1))
    const res = await markNotificationRead(n.id)
    if (!res.ok) toast.error(res.error)
  }

  async function markAll() {
    setItems((prev) => prev.map((p) => ({ ...p, is_read: true })))
    setUnread(0)
    const res = await markAllNotificationsRead()
    if (!res.ok) toast.error(res.error)
  }

  function openNotification(n: AppNotification) {
    void markRead(n)
    setOpen(false)
    if (n.link) router.push(n.link)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`} />
        }
      >
        <BellIcon />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white tabular-nums">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(24rem,calc(100vw-2rem))] gap-0 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          <Button variant="ghost" size="xs" onClick={markAll} disabled={unread === 0}>
            <CheckCheckIcon /> Mark all as read
          </Button>
        </div>
        <ul className="max-h-96 overflow-y-auto" aria-label="Recent notifications">
          {items.length === 0 && (
            <li className="px-4 py-10 text-center text-sm text-muted-foreground">You&apos;re all caught up.</li>
          )}
          {items.map((n) => {
            const { icon: Icon, className } = NOTIFICATION_ICONS[n.type] ?? NOTIFICATION_ICONS.system
            return (
              <li key={n.id} className={cn("group relative border-b last:border-b-0", !n.is_read && "bg-primary/[0.03]")}>
                <button
                  type="button"
                  onClick={() => openNotification(n)}
                  className="flex w-full gap-3 px-4 py-3 text-left outline-none hover:bg-muted/60 focus-visible:bg-muted/60"
                >
                  <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", className)}>
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block truncate text-sm", !n.is_read && "font-semibold")}>{n.title}</span>
                    <span className="line-clamp-2 text-xs text-muted-foreground">{n.message}</span>
                    <span className="mt-1 block text-[11px] text-muted-foreground">{formatRelative(n.created_at)}</span>
                  </span>
                  {!n.is_read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
                </button>
                {!n.is_read && (
                  <button
                    type="button"
                    onClick={() => markRead(n)}
                    className="absolute right-3 bottom-2 rounded px-1.5 py-0.5 text-[11px] text-primary opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                  >
                    Mark as read
                  </button>
                )}
              </li>
            )
          })}
        </ul>
        <div className="border-t p-2">
          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block rounded-md py-1.5 text-center text-sm font-medium text-primary hover:bg-muted"
          >
            View all notifications
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  )
}
