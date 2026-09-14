"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { animate, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { dur, ease, group, maskUp, stagger } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Signature moment: the lease ledger. Six channels a retailer is already
 * paying for assemble row by row, their annual cost counts up, and the
 * "in use" column shows what most retailers actually engage: one.
 * Then the total resolves. Nothing else on the page competes with it.
 */
const CHANNELS = [
  { name: "Center website", paid: 14_400, used: true },
  { name: "Center mobile app", paid: 9_600, used: false },
  { name: "Email to shoppers", paid: 7_200, used: false },
  { name: "Social channels", paid: 8_400, used: false },
  { name: "Digital signage", paid: 12_000, used: false },
  { name: "Events & activations", paid: 6_000, used: false },
];
const TOTAL = CHANNELS.reduce((n, c) => n + c.paid, 0);

const lines = ["You already pay your", "shopping centers to promote", "your stores.", "Most of that money", "buys nothing."];

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-line bg-bg">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_70%_10%,color-mix(in_oklab,var(--accent)_14%,transparent),transparent_70%)]" aria-hidden />
      <div className="mx-auto grid max-w-6xl gap-12 px-6 pb-20 pt-16 md:grid-cols-[1.1fr_0.9fr] md:items-center md:pb-28 md:pt-24">
        <div>
          <motion.p
            className="mb-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: dur.base, ease: ease.out }}
          >
            For retailers with 10 to 1,000 stores · US & Canada
          </motion.p>
          <motion.h1
            className="text-balance text-4xl font-semibold leading-[1.05] tracking-[-0.02em] sm:text-5xl md:text-[3.6rem]"
            variants={group(stagger.lines, 0.05)}
            initial="hidden"
            animate="visible"
            aria-label={lines.join(" ")}
          >
            {lines.map((line, i) => (
              <span key={line} className="block overflow-hidden pb-[0.08em]" aria-hidden>
                <motion.span className={cn("block", i >= 3 && "text-accent")} variants={maskUp}>
                  {line}
                </motion.span>
              </span>
            ))}
          </motion.h1>
          <motion.p
            className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-fg-muted"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: dur.slow, ease: ease.out, delay: 0.45 }}
          >
            Every lease you sign funds the center's website, app, email list, social feeds and signs. Only 1 in 10 retailers uses them. Engagement Agents puts your campaign in every channel you're already paying for, from one place.
          </motion.p>
          <motion.div
            className="mt-8 flex flex-wrap items-center gap-3"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: dur.slow, ease: ease.out, delay: 0.55 }}
          >
            <a
              href="https://www.engagementagents.com/book-a-demo"
              className="inline-flex h-12 items-center gap-2 rounded-md bg-accent px-6 text-sm font-semibold text-accent-fg shadow-sm transition-[transform,background-color] duration-150 hover:bg-pink-600 active:translate-y-px"
            >
              Book a demo <ArrowRight className="size-4" />
            </a>
            <Link
              href="/app"
              className="inline-flex h-12 items-center gap-2 rounded-md border border-line-strong bg-bg-elev px-6 text-sm font-medium transition-colors duration-150 hover:bg-bg-muted"
            >
              See the platform live
            </Link>
          </motion.div>
          <motion.p className="mt-4 text-xs text-fg-subtle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7, duration: dur.base }}>
            Started by a retailer. Used by Nordstrom Rack, Levi's, Guess, Pandora, Under Armour and 40+ more.
          </motion.p>
        </div>
        <Ledger />
      </div>
    </section>
  );
}

function Ledger() {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="relative rounded-2xl border border-line bg-bg-elev p-5 shadow-[0_20px_60px_-30px_rgba(52,27,65,0.35)] md:p-6"
      initial={reduce ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: dur.hero, ease: ease.out, delay: 0.25 }}
      aria-label="Example of one store's yearly marketing spend inside its lease"
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-muted">One store · one lease · one year</p>
          <p className="text-sm font-medium">Marketing you already paid for</p>
        </div>
        <span className="rounded-full bg-plum-100 px-2 py-0.5 text-[11px] font-medium text-plum-800 dark:bg-plum-900/60 dark:text-plum-200">illustrative</span>
      </div>
      <motion.ul className="divide-y divide-line" variants={group(stagger.rows, 0.55)} initial="hidden" animate="visible">
        {CHANNELS.map((c) => (
          <motion.li
            key={c.name}
            className="flex items-center justify-between py-2.5 text-sm"
            variants={{ hidden: { opacity: 0, x: -8 }, visible: { opacity: 1, x: 0, transition: { duration: dur.base, ease: ease.out } } }}
          >
            <span className="flex items-center gap-2.5">
              <span className={cn("size-2 rounded-full", c.used ? "bg-emerald-500" : "bg-red-400")} aria-hidden />
              {c.name}
            </span>
            <span className="flex items-center gap-4">
              <span className={cn("w-16 text-right text-xs", c.used ? "text-emerald-700 dark:text-emerald-300" : "text-red-600 dark:text-red-300")}>{c.used ? "in use" : "unused"}</span>
              <Money value={c.paid} className="w-20 text-right tabular" delay={0.7} />
            </span>
          </motion.li>
        ))}
      </motion.ul>
      <motion.div
        className="mt-4 flex items-center justify-between border-t-2 border-fg pt-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.35, duration: dur.base }}
      >
        <span className="text-sm font-medium">Paid for, not used</span>
        <Money value={TOTAL - CHANNELS.filter((c) => c.used).reduce((n, c) => n + c.paid, 0)} className="text-lg font-semibold tabular text-accent" delay={1.4} duration={1.1} />
      </motion.div>
      <p className="mt-3 text-xs text-fg-subtle">Per store, per year. Multiply by your store count.</p>
    </motion.div>
  );
}

function Money({ value, className, delay = 0, duration = 0.9 }: { value: number; className?: string; delay?: number; duration?: number }) {
  const reduce = useReducedMotion();
  const [n, setN] = useState(reduce ? value : 0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (reduce) return;
    const controls = animate(0, value, { duration, delay, ease: ease.out, onUpdate: (v) => setN(Math.round(v)) });
    return () => controls.stop();
  }, [value, delay, duration, reduce]);
  return (
    <span ref={ref} className={className}>
      ${n.toLocaleString("en-US")}
    </span>
  );
}
