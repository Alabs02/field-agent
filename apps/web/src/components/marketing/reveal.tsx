"use client";

import { motion, type Variants } from "motion/react";
import type * as React from "react";
import { dur, ease, fadeUp, group, inView, stagger } from "@/lib/motion";

/** Section reveal: once, on entering the viewport. The support layer. */
export function Reveal({ children, className, delay = 0, as = "div" }: { children: React.ReactNode; className?: string; delay?: number; as?: "div" | "section" | "li" | "p" | "h2" }) {
  const Comp = motion[as];
  const variants: Variants = delay
    ? { hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: dur.slow, ease: ease.out, delay } } }
    : fadeUp;
  return (
    <Comp className={className} variants={variants} initial="hidden" whileInView="visible" viewport={inView}>
      {children}
    </Comp>
  );
}

/** Orchestrates children that carry `fadeUp` variants themselves. */
export function RevealGroup({ children, className, gap = stagger.cards, as = "div" }: { children: React.ReactNode; className?: string; gap?: number; as?: "div" | "ul" | "ol" }) {
  const Comp = motion[as];
  return (
    <Comp className={className} variants={group(gap)} initial="hidden" whileInView="visible" viewport={inView}>
      {children}
    </Comp>
  );
}

export function RevealItem({ children, className, as = "div" }: { children: React.ReactNode; className?: string; as?: "div" | "li" | "article" }) {
  const Comp = motion[as];
  return (
    <Comp className={className} variants={fadeUp}>
      {children}
    </Comp>
  );
}
