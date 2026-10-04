"use client"

import * as React from "react"
import { formatDate, formatTime, greetingFor } from "@/lib/datetime"

const TICK_MS = 5_000

function subscribe(onTick: () => void) {
  const id = setInterval(onTick, TICK_MS)
  return () => clearInterval(id)
}
// Snapshot changes once per tick, so React only re-renders when needed.
const getTick = () => Math.floor(Date.now() / TICK_MS)
const getServerTick = () => null

/** Current time, refreshed every few seconds; null during server render/hydration. */
function useNow() {
  const tick = React.useSyncExternalStore(subscribe, getTick, getServerTick)
  return tick === null ? null : new Date()
}

export function Greeting({ name, initialGreeting }: { name: string; initialGreeting: string }) {
  const now = useNow()
  const firstName = name.split(" ")[0] || name
  return (
    <p className="truncate text-sm font-medium sm:text-base">
      {now ? greetingFor(now) : initialGreeting}, <span className="font-semibold">{firstName}</span>
    </p>
  )
}

export function DateTimeDisplay() {
  const now = useNow()
  if (!now) {
    return <span className="inline-block h-4 w-48 animate-pulse rounded bg-muted" aria-hidden />
  }
  return (
    <time dateTime={now.toISOString()} className="text-sm whitespace-nowrap text-muted-foreground tabular-nums">
      {formatDate(now, "long")} <span aria-hidden className="mx-1 text-border">|</span> {formatTime(now)}
    </time>
  )
}
