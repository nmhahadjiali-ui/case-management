"use client"

import * as React from "react"
import Link from "next/link"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { BarChart3Icon, TableIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/shared/empty-state"

type Row = { name: string; slug: string; total: number }

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: Row }[] }) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <div className="rounded-lg bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md ring-1 ring-foreground/10">
      <p className="font-medium">{row.name}</p>
      <p className="text-muted-foreground">
        <span className="font-semibold text-foreground tabular-nums">{row.total}</span> case{row.total === 1 ? "" : "s"}
      </p>
    </div>
  )
}

/** Single-series bar chart of case counts per type (data from Supabase). */
export function CasesByTypeChart({ data }: { data: Row[] }) {
  const [view, setView] = React.useState<"chart" | "table">("chart")
  const total = data.reduce((s, r) => s + Number(r.total), 0)
  const rows = data.map((r) => ({ ...r, total: Number(r.total) }))

  if (total === 0) {
    return <EmptyState icon={BarChart3Icon} title="No cases yet" description="Case counts by type will appear here." />
  }

  return (
    <div className="grid gap-2">
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="xs"
          onClick={() => setView(view === "chart" ? "table" : "chart")}
          aria-pressed={view === "table"}
        >
          {view === "chart" ? <TableIcon /> : <BarChart3Icon />}
          {view === "chart" ? "View as table" : "View as chart"}
        </Button>
      </div>
      {view === "chart" ? (
        <div className="h-72 w-full" role="img" aria-label={`Bar chart of ${total} cases by type`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barCategoryGap="22%">
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="0" />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                interval={0}
                angle={-30}
                textAnchor="end"
                height={56}
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                width={40}
              />
              <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.6 }} content={<ChartTooltip />} />
              <Bar dataKey="total" name="Cases" fill="var(--chart-bar)" radius={[4, 4, 0, 0]} maxBarSize={44} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <table className="w-full text-sm">
          <caption className="sr-only">Cases by type</caption>
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th scope="col" className="py-2 font-medium">Case type</th>
              <th scope="col" className="py-2 text-right font-medium">Cases</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.slug} className="border-b last:border-0">
                <td className="py-1.5">
                  <Link href={`/cases?type=${r.slug}`} className="hover:underline">
                    {r.name}
                  </Link>
                </td>
                <td className="py-1.5 text-right tabular-nums">{r.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
