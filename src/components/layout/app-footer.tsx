import Link from "next/link"
import { APP_COPYRIGHT_START, APP_DEVELOPER, APP_NAME } from "@/lib/constants"
import { cn } from "@/lib/utils"

/** "© 2026 CaseFlow. All rights reserved. · Developed by …" shown at the bottom of every page. */
export function AppFooter({ className, showAboutLink = true }: { className?: string; showAboutLink?: boolean }) {
  const year = new Date().getFullYear()
  const years = year > APP_COPYRIGHT_START ? `${APP_COPYRIGHT_START}–${year}` : `${APP_COPYRIGHT_START}`
  return (
    <footer className={cn("flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-xs text-muted-foreground", className)}>
      <span>© {years} {APP_NAME}. All rights reserved.</span>
      <span aria-hidden>·</span>
      <span>
        Developed by <span className="font-medium text-foreground">{APP_DEVELOPER}</span>
      </span>
      {showAboutLink && (
        <>
          <span aria-hidden>·</span>
          <Link href="/settings/about" className="hover:text-foreground hover:underline">
            About &amp; Credits
          </Link>
        </>
      )}
    </footer>
  )
}
