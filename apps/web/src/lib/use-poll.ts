"use client";

import { useEffect, useRef, useState } from "react";
import type { z } from "zod";

/**
 * Poll a /backend path every `intervalMs` until `until(data)` is true.
 * Plain fetch + setInterval; no query library needed for one dashboard.
 */
export function usePoll<T extends z.ZodTypeAny>(
  path: string | null,
  schema: T,
  opts: { intervalMs?: number; until?: (data: z.infer<T>) => boolean; initial?: z.infer<T> } = {},
): { data: z.infer<T> | null; error: string | null; live: boolean } {
  const [data, setData] = useState<z.infer<T> | null>(opts.initial ?? null);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState<boolean>(path != null);
  const untilRef = useRef(opts.until);
  untilRef.current = opts.until;

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      try {
        const res = await fetch(`/backend${path}`, { cache: "no-store" });
        const json = (await res.json()) as unknown;
        if (!res.ok) throw new Error((json as { error?: { message?: string } }).error?.message ?? `HTTP ${res.status}`);
        const parsed = schema.parse(json) as z.infer<T>;
        if (cancelled) return;
        setData(parsed);
        setError(null);
        if (untilRef.current?.(parsed)) {
          setLive(false);
          return;
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
      if (!cancelled) timer = setTimeout(tick, opts.intervalMs ?? 2000);
    };
    setLive(true);
    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [path, opts.intervalMs]);

  return { data, error, live };
}
