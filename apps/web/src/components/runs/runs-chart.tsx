"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ScrapeRun } from "@field-agent/shared";
import { fmtDateTime } from "@/lib/format";

/** Stacked outcomes per scrape run: the honest shape of "what did the run do". */
export function RunsChart({ runs }: { runs: ScrapeRun[] }) {
  const data = runs.map((r) => ({
    name: fmtDateTime(r.queuedAt),
    New: r.counts.persisted,
    Updated: r.counts.updated,
    Unchanged: r.counts.skipped,
    Failed: r.counts.failed,
  }));
  return (
    <div className="h-56 w-full text-xs">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 4, right: 8, left: -18, bottom: 0 }} barCategoryGap="30%">
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "var(--fg-subtle)", fontSize: 11 }} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "var(--fg-subtle)", fontSize: 11 }} />
          <Tooltip
            cursor={{ fill: "var(--bg-muted)" }}
            contentStyle={{ background: "var(--bg-elev)", border: "1px solid var(--line)", borderRadius: 8, fontSize: 12, color: "var(--fg)" }}
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: "var(--fg-muted)" }} />
          <Bar dataKey="New" stackId="a" fill="#1f9d5f" radius={[0, 0, 0, 0]} />
          <Bar dataKey="Updated" stackId="a" fill="#6b4a7e" />
          <Bar dataKey="Unchanged" stackId="a" fill="#b8ab9e" />
          <Bar dataKey="Failed" stackId="a" fill="#d33c3c" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
