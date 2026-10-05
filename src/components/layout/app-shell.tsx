"use client"

import * as React from "react"
import Link from "next/link"
import { MenuIcon, ScrollTextIcon } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Sidebar } from "@/components/layout/sidebar"
import { CalendarMenu } from "@/components/layout/calendar-menu"
import { NotificationsMenu } from "@/components/layout/notifications-menu"
import { DateTimeDisplay, Greeting } from "@/components/layout/header-clock"
import { setSidebarCollapsed } from "@/lib/actions/settings"
import { cn } from "@/lib/utils"
import type { AppNotification, Profile } from "@/lib/types"

function HeaderIconLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={<Link href={href} aria-label={label} className={buttonVariants({ variant: "ghost", size: "icon" })} />}
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

export function AppShell({
  profile,
  initialCollapsed,
  initialGreeting,
  notifications,
  unread,
  children,
}: {
  profile: Profile
  initialCollapsed: boolean
  initialGreeting: string
  notifications: AppNotification[]
  unread: number
  children: React.ReactNode
}) {
  const [collapsed, setCollapsed] = React.useState(initialCollapsed)
  const [mobileOpen, setMobileOpen] = React.useState(false)

  function toggleSidebar() {
    if (window.matchMedia("(min-width: 1024px)").matches) {
      const next = !collapsed
      setCollapsed(next)
      void setSidebarCollapsed(next)
    } else {
      setMobileOpen((o) => !o)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 border-r transition-[width] duration-200 lg:block",
          collapsed ? "w-[4.25rem]" : "w-64"
        )}
      >
        <Sidebar profile={profile} collapsed={collapsed} />
      </aside>

      {/* Mobile / tablet drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 max-w-[85vw] p-0" showCloseButton={false}>
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Sidebar profile={profile} collapsed={false} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur supports-backdrop-filter:bg-background/80 sm:px-4">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              aria-label="Toggle navigation"
              aria-expanded={mobileOpen || !collapsed}
            >
              <MenuIcon />
            </Button>
            <Greeting name={profile.full_name} initialGreeting={initialGreeting} />
          </div>

          <div className="hidden flex-1 justify-center md:flex">
            <DateTimeDisplay />
          </div>

          <div className="flex flex-1 items-center justify-end gap-1">
            <HeaderIconLink href="/oath" label="Oath">
              <ScrollTextIcon />
            </HeaderIconLink>
            <CalendarMenu />
            <NotificationsMenu userId={profile.id} initialItems={notifications} initialUnread={unread} />
          </div>
        </header>

        <main id="main" className="mx-auto w-full max-w-[1600px] flex-1 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
