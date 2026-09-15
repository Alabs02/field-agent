"use client";

import { useEffect, useRef, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Tooltip, XAxis, YAxis } from "recharts";
import type { ScrapeRun } from "@field-agent/shared";
import { fmtDateTime } from "@/lib/format";

/** Measure the container ourselves; more predictable than ResponsiveContainer under SSR + streaming. */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry?.contentRect.width ?? 0)));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  return { ref, width };
}

/** Stacked outcomes per scrape run: the honest shape of "what did the run do". */
export function RunsChart({ runs }: { runs: ScrapeRun[] }) {
  const { ref, width } = useWidth<HTMLDivElement>();
  const data = runs.map((r) => ({
    name: fmtDateTime(r.queuedAt),
    New: r.counts.persisted,
    Updated: r.counts.updated,
    Unchanged: r.counts.skipped,
    Failed: r.counts.failed,
  }));
  return (
    <div ref={ref} className="h-56 w-full text-xs">
      {width > 0 ? (
        <BarChart width={width} height={224} data={data} margin={{ top: 4, right: 8, left: -18, bottom: 0 }} barCategoryGap="30%">
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "var(--fg-subtle)", fontSize: 11 }} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "var(--fg-subtle)", fontSize: 11 }} />
          <Tooltip
            cursor={{ fill: "var(--bg-muted)" }}
            contentStyle={{ background: "var(--bg-elev)", border: "1px solid var(--line)", borderRadius: 8, fontSize: 12, color: "var(--fg)" }}
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: "var(--fg-muted)" }} />
          <Bar dataKey="New" stackId="a" fill="#1f9d5f" isAnimationActive={false} />
          <Bar dataKey="Updated" stackId="a" fill="#42c3f1" isAnimationActive={false} />
          <Bar dataKey="Unchanged" stackId="a" fill="#b8ab9e" isAnimationActive={false} />
          <Bar dataKey="Failed" stackId="a" fill="#d33c3c" radius={[3, 3, 0, 0]} isAnimationActive={false} />
        </BarChart>
      ) : null}
    </div>
  );
}
