"use client"

import * as React from "react"
import Image from "next/image"
import { APP_NAME, APP_TAGLINE, SPLASH_SEEN_KEY } from "@/lib/constants"
import { cn } from "@/lib/utils"

const VISIBLE_MS = 2300
const REDUCED_MOTION_MS = 900
const FADE_MS = 450

/**
 * Full-screen splash with the court seal, shown once per browser tab session.
 * It is server-rendered so it covers the page from the first paint; an inline
 * script in the root layout hides it before paint when it was already seen.
 */
export function SplashScreen({ logoUrl }: { logoUrl: string | null }) {
  const [phase, setPhase] = React.useState<"visible" | "leaving" | "gone">("visible")

  React.useEffect(() => {
    try {
      sessionStorage.setItem(SPLASH_SEEN_KEY, "1")
    } catch {
      // Storage unavailable (private mode): the splash simply shows on each load.
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const leave = window.setTimeout(() => setPhase("leaving"), reduced ? REDUCED_MOTION_MS : VISIBLE_MS)
    const skip = () => setPhase((p) => (p === "visible" ? "leaving" : p))
    window.addEventListener("keydown", skip, { once: true })
    return () => {
      window.clearTimeout(leave)
      window.removeEventListener("keydown", skip)
    }
  }, [])

  React.useEffect(() => {
    if (phase !== "leaving") return
    const done = window.setTimeout(() => setPhase("gone"), FADE_MS)
    return () => window.clearTimeout(done)
  }, [phase])

  if (phase === "gone") return null

  return (
    <div
      className={cn(
        "app-splash fixed inset-0 z-100 flex cursor-pointer flex-col items-center justify-center gap-6 bg-card px-6 transition-opacity duration-450 motion-reduce:transition-none",
        phase === "leaving" && "pointer-events-none opacity-0"
      )}
      role="status"
      aria-label={`Loading ${APP_NAME}`}
      onClick={() => setPhase("leaving")}
    >
      <div className="splash-seal relative">
        <span className="splash-halo absolute inset-0 rounded-full" aria-hidden />
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote, admin-uploaded image of unknown size
          <img
            src={logoUrl}
            alt={`${APP_NAME} logo`}
            className="relative size-48 object-contain drop-shadow-md select-none sm:size-60"
            draggable={false}
          />
        ) : (
          <Image
            src="/brand/court-seal.webp"
            alt="Shari'ah Court of Appeal, Ranao Region seal"
            width={640}
            height={640}
            priority
            className="relative size-48 drop-shadow-md select-none sm:size-60"
            draggable={false}
          />
        )}
      </div>
      <div className="splash-text grid gap-1 text-center">
        <p className="text-2xl font-semibold tracking-tight">{APP_NAME}</p>
        <p className="text-sm text-muted-foreground">{APP_TAGLINE}</p>
      </div>
      <div className="h-1 w-40 overflow-hidden rounded-full bg-muted" aria-hidden>
        <div className="splash-progress h-full rounded-full bg-primary" />
      </div>
    </div>
  )
}
