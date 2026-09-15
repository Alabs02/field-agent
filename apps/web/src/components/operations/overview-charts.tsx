"use client";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import type { OverviewSchema } from "@field-agent/shared";
import type { z } from "zod";

type Row = Record<string, string | number>;
type Series = { key: string; label: string; color: string };
type Chart = { title: string; subtitle: string; rows: Row[]; xKey: string; series: Series[] };

const tooltip = { background: "var(--bg-elev)", border: "1px solid var(--line)", borderRadius: 8, color: "var(--fg)" };

export function OverviewCharts({ data }: { data: z.infer<typeof OverviewSchema> }) {
  const charts: Chart[] = [
    { title: "Expiration timeline", subtitle: "Listed promotions ending in the next 30 days", rows: data.expirations, xKey: "day", series: [{ key: "count", label: "Promotions", color: "#cb5b8c" }] },
    { title: "Campaigns by brand", subtitle: "Top 12 brands by current listed inventory", rows: data.brands, xKey: "name", series: [{ key: "count", label: "Promotions", color: "#6b4a7e" }] },
    { title: "Run outcomes", subtitle: "Runs queued during the selected period", rows: data.outcomes, xKey: "day", series: [{ key: "completed", label: "Completed", color: "#1f9d5f" }, { key: "partial", label: "Partial", color: "#c18b25" }, { key: "failed", label: "Needs attention", color: "#d33c3c" }] },
  ];
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      {charts.map((chart) => (
        <section key={chart.title} className="min-w-0 rounded-xl border border-line bg-bg-elev p-5">
          <h2 className="font-semibold">{chart.title}</h2>
          <p className="mb-5 mt-1 text-xs text-fg-muted">{chart.subtitle}</p>
          {chart.rows.length ? (
            <div className="h-60 text-xs" role="img" aria-label={`${chart.title}: ${JSON.stringify(chart.rows)}`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart.rows} margin={{ left: -20, right: 10 }}>
                  <CartesianGrid vertical={false} stroke="var(--line)" />
                  <XAxis dataKey={chart.xKey} tick={{ fontSize: 10, fill: "var(--fg-muted)" }} />
                  <YAxis allowDecimals={false} tick={{ fill: "var(--fg-muted)" }} />
                  <Tooltip contentStyle={tooltip} />
                  <Legend />
                  {chart.series.map((series) => (
                    <Bar key={series.key} dataKey={series.key} name={series.label} stackId="a" fill={series.color} isAnimationActive={false} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="grid h-60 place-items-center text-sm text-fg-muted">No observations in this scope.</p>
          )}
        </section>
      ))}
    </div>
  );
}
