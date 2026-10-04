import {
  BriefcaseIcon,
  CalendarDaysIcon,
  CheckSquareIcon,
  LayoutDashboardIcon,
  SettingsIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react"

export type NavItem = { href: string; label: string; icon: LucideIcon }

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboardIcon },
  { href: "/cases", label: "Case Management", icon: BriefcaseIcon },
  { href: "/people", label: "People", icon: UsersIcon },
  { href: "/calendar", label: "Calendar", icon: CalendarDaysIcon },
  { href: "/tasks", label: "Tasks", icon: CheckSquareIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
]

export function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}
