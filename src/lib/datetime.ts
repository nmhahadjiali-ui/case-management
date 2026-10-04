// Date/time helpers.
// All display and "what day is it" logic uses one application time zone
// (NEXT_PUBLIC_APP_TIMEZONE) so the server and every browser agree.
// Date-only values (YYYY-MM-DD) are handled as plain calendar dates.

export const APP_TIMEZONE = process.env.NEXT_PUBLIC_APP_TIMEZONE || "UTC"

type DateInput = Date | string | number

const toDate = (d: DateInput) => (d instanceof Date ? d : new Date(d))

function parts(date: Date, timeZone = APP_TIMEZONE) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  })
  const out: Record<string, string> = {}
  for (const p of fmt.formatToParts(date)) out[p.type] = p.value
  return {
    year: Number(out.year),
    month: Number(out.month),
    day: Number(out.day),
    hour: Number(out.hour),
    minute: Number(out.minute),
    second: Number(out.second),
  }
}

const pad = (n: number) => String(n).padStart(2, "0")

/** "YYYY-MM-DD" of an instant, in the app time zone. */
export function dateKey(d: DateInput) {
  const p = parts(toDate(d))
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`
}

/** "HH:mm" (24h) of an instant, in the app time zone. */
export function timeKey(d: DateInput) {
  const p = parts(toDate(d))
  return `${pad(p.hour)}:${pad(p.minute)}`
}

/** Today's date ("YYYY-MM-DD") in the app time zone. */
export function todayKey() {
  return dateKey(new Date())
}

/** Convert a wall-clock date + time in the app time zone to a UTC Date. */
export function zonedToUtc(date: string, time = "00:00", timeZone = APP_TIMEZONE) {
  const [y, m, d] = date.split("-").map(Number)
  const [hh, mm] = time.split(":").map(Number)
  const wallAsUtc = Date.UTC(y, m - 1, d, hh || 0, mm || 0)
  const offsetAt = (t: number) => {
    const p = parts(new Date(t), timeZone)
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - t
  }
  // Two passes handle daylight-saving transitions correctly.
  let guess = wallAsUtc - offsetAt(wallAsUtc)
  guess = wallAsUtc - offsetAt(guess)
  return new Date(guess)
}

// ---- Calendar-date arithmetic on "YYYY-MM-DD" keys (time-zone free) ----

function keyToUtc(key: string) {
  const [y, m, d] = key.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

function utcToKey(d: Date) {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

export function addDaysKey(key: string, days: number) {
  const d = keyToUtc(key)
  d.setUTCDate(d.getUTCDate() + days)
  return utcToKey(d)
}

export function addMonthsKey(key: string, months: number) {
  const d = keyToUtc(key)
  const day = d.getUTCDate()
  d.setUTCDate(1)
  d.setUTCMonth(d.getUTCMonth() + months)
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()
  d.setUTCDate(Math.min(day, lastDay))
  return utcToKey(d)
}

/** 0 = Sunday ... 6 = Saturday */
export function weekdayOfKey(key: string) {
  return keyToUtc(key).getUTCDay()
}

export function startOfWeekKey(key: string) {
  return addDaysKey(key, -weekdayOfKey(key))
}

export function startOfMonthKey(key: string) {
  return key.slice(0, 8) + "01"
}

export function isValidDateKey(value: string | undefined | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  return utcToKey(keyToUtc(value)) === value
}

export function diffDaysKey(a: string, b: string) {
  return Math.round((keyToUtc(a).getTime() - keyToUtc(b).getTime()) / 86_400_000)
}

// ---- Formatting ----

/** e.g. "October 4, 2026" (accepts an instant or a YYYY-MM-DD key) */
export function formatDate(value: DateInput | null | undefined, style: "long" | "medium" | "short" = "medium") {
  if (value === null || value === undefined || value === "") return "—"
  const opts: Intl.DateTimeFormatOptions =
    style === "long"
      ? { month: "long", day: "numeric", year: "numeric" }
      : style === "medium"
        ? { month: "short", day: "numeric", year: "numeric" }
        : { month: "short", day: "numeric" }
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Intl.DateTimeFormat("en-US", { ...opts, timeZone: "UTC" }).format(keyToUtc(value))
  }
  return new Intl.DateTimeFormat("en-US", { ...opts, timeZone: APP_TIMEZONE }).format(toDate(value))
}

/** e.g. "7:15 PM" */
export function formatTime(value: DateInput | null | undefined) {
  if (value === null || value === undefined || value === "") return "—"
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: APP_TIMEZONE,
  }).format(toDate(value))
}

/** e.g. "Oct 4, 2026, 7:15 PM" */
export function formatDateTime(value: DateInput | null | undefined) {
  if (value === null || value === undefined || value === "") return "—"
  return `${formatDate(value)}, ${formatTime(value)}`
}

/** e.g. "Saturday" for a YYYY-MM-DD key */
export function formatWeekday(key: string, style: "long" | "short" = "long") {
  return new Intl.DateTimeFormat("en-US", { weekday: style, timeZone: "UTC" }).format(keyToUtc(key))
}

/** e.g. "October 2026" for a YYYY-MM-DD key */
export function formatMonthYear(key: string) {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(keyToUtc(key))
}

/** Relative description such as "5 minutes ago" or "in 2 days". */
export function formatRelative(value: DateInput, now: Date = new Date()) {
  const diffSec = Math.round((toDate(value).getTime() - now.getTime()) / 1000)
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" })
  const abs = Math.abs(diffSec)
  if (abs < 60) return rtf.format(diffSec, "second")
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute")
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour")
  if (abs < 86400 * 30) return rtf.format(Math.round(diffSec / 86400), "day")
  return formatDate(value)
}

/** "Good Morning" / "Good Afternoon" / "Good Evening" in the app time zone. */
export function greetingFor(d: Date = new Date()) {
  const hour = parts(d).hour
  if (hour < 12) return "Good Morning"
  if (hour < 18) return "Good Afternoon"
  return "Good Evening"
}
