"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BellIcon,
  BriefcaseIcon,
  CalendarIcon,
  FileClockIcon,
  ImageIcon,
  InfoIcon,
  PaletteIcon,
  ServerIcon,
  ShieldIcon,
  UserIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

type Item = { href: string; label: string; icon: LucideIcon; adminOnly?: boolean }

const GROUPS: { title: string; items: Item[] }[] = [
  {
    title: "Personal",
    items: [
      { href: "/settings/profile", label: "Account", icon: UserIcon },
      { href: "/settings/appearance", label: "Appearance", icon: PaletteIcon },
      { href: "/settings/notifications", label: "Notifications", icon: BellIcon },
      { href: "/settings/calendar", label: "Calendar", icon: CalendarIcon },
      { href: "/settings/security", label: "Security", icon: ShieldIcon },
    ],
  },
  {
    title: "Organization",
    items: [
      { href: "/settings/cases", label: "Case Management", icon: BriefcaseIcon },
      { href: "/settings/users", label: "Users & Roles", icon: UsersIcon, adminOnly: true },
      { href: "/settings/branding", label: "Branding", icon: ImageIcon, adminOnly: true },
      { href: "/settings/audit-logs", label: "Audit Logs", icon: FileClockIcon, adminOnly: true },
      { href: "/settings/system", label: "System", icon: ServerIcon, adminOnly: true },
    ],
  },
  {
    title: "About",
    items: [{ href: "/settings/about", label: "About & Credits", icon: InfoIcon }],
  },
]

export function SettingsNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname()
  return (
    <nav aria-label="Settings" className="-mx-1 overflow-x-auto px-1 lg:mx-0 lg:overflow-visible lg:px-0">
      <div className="flex gap-1 lg:grid lg:gap-5">
        {GROUPS.map((g) => (
          <div key={g.title} className="flex gap-1 lg:grid">
            <p className="hidden px-3 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase lg:block">{g.title}</p>
            {g.items
              .filter((i) => !i.adminOnly || isAdmin)
              .map(({ href, label, icon: Icon }) => {
                const active = pathname === href
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex h-9 shrink-0 items-center gap-2.5 rounded-lg px-3 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                      active && "bg-muted text-foreground"
                    )}
                  >
                    <Icon className={cn("size-4", active && "text-primary")} aria-hidden />
                    {label}
                  </Link>
                )
              })}
          </div>
        ))}
      </div>
    </nav>
  )
}
