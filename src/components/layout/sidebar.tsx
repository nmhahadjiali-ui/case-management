"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LogOutIcon } from "lucide-react"
import { BrandLogo } from "@/components/shared/brand-logo"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { UserAvatar } from "@/components/shared/user-avatar"
import { NAV_ITEMS, isActivePath } from "@/components/layout/nav-items"
import { APP_NAME, APP_TAGLINE, USER_ROLES, labelOf } from "@/lib/constants"
import { signOut } from "@/lib/actions/auth"
import { cn } from "@/lib/utils"
import type { Profile } from "@/lib/types"

/** Wraps children in a tooltip only when the sidebar is collapsed. */
function MaybeTooltip({ show, label, children }: { show: boolean; label: string; children: React.ReactElement }) {
  if (!show) return children
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  )
}

export function Sidebar({
  profile,
  logoUrl,
  collapsed,
  onNavigate,
}: {
  profile: Profile
  logoUrl: string | null
  collapsed: boolean
  onNavigate?: () => void
}) {
  const pathname = usePathname()

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Logo */}
      <div className={cn("flex h-16 shrink-0 items-center gap-3 border-b px-4", collapsed && "justify-center px-0")}>
        <BrandLogo src={logoUrl} />
        {!collapsed && (
          <div className="min-w-0 leading-tight">
            <p className="truncate font-semibold">{APP_NAME}</p>
            <p className="truncate text-xs text-muted-foreground">{APP_TAGLINE}</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav aria-label="Main" className="flex-1 overflow-y-auto p-3">
        <ul className="grid gap-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActivePath(pathname, href)
            return (
              <li key={href}>
                <MaybeTooltip show={collapsed} label={label}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    aria-label={collapsed ? label : undefined}
                    className={cn(
                      "flex h-9 items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors outline-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
                      active && "bg-sidebar-accent text-sidebar-accent-foreground",
                      collapsed && "justify-center px-0"
                    )}
                  >
                    <Icon className={cn("size-4 shrink-0", active && "text-primary")} aria-hidden />
                    {!collapsed && <span className="truncate">{label}</span>}
                  </Link>
                </MaybeTooltip>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User */}
      <div className="border-t p-3">
        <div className={cn("flex items-center gap-3", collapsed && "flex-col")}>
          <MaybeTooltip show={collapsed} label={profile.full_name}>
            <Link
              href="/settings/profile"
              onClick={onNavigate}
              className={cn(
                "flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1 outline-none hover:bg-sidebar-accent focus-visible:ring-3 focus-visible:ring-ring/50",
                collapsed && "flex-none"
              )}
            >
              <UserAvatar name={profile.full_name} src={profile.avatar_url} />
              {!collapsed && (
                <div className="min-w-0 leading-tight">
                  <p className="truncate text-sm font-medium">{profile.full_name}</p>
                  <p className="truncate text-xs text-muted-foreground">{labelOf(USER_ROLES, profile.role)}</p>
                </div>
              )}
            </Link>
          </MaybeTooltip>
          <form action={signOut}>
            <MaybeTooltip show label="Log out">
              <button
                type="submit"
                aria-label="Log out"
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors outline-none hover:bg-destructive/10 hover:text-destructive focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <LogOutIcon className="size-4" aria-hidden />
              </button>
            </MaybeTooltip>
          </form>
        </div>
      </div>
    </div>
  )
}
