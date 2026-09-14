import type { Transition, Variants } from "motion/react";

/*
  Motion system. Register: precise. Short, tight, decelerating; nothing bounces.
  Every duration and easing on the lander comes from here.
*/
export const ease = {
  out: [0.16, 1, 0.3, 1],
  outSoft: [0.22, 1, 0.36, 1],
  in: [0.7, 0, 0.84, 0],
  inOut: [0.76, 0, 0.24, 1],
  ui: [0.4, 0, 0.2, 1],
} as const;

export const dur = {
  instant: 0.12,
  fast: 0.18,
  base: 0.32,
  slow: 0.55,
  hero: 0.85,
} as const;

export const spring = {
  smooth: { type: "spring", visualDuration: 0.45, bounce: 0 },
  scroll: { stiffness: 90, damping: 25, restDelta: 0.0005 },
} as const satisfies Record<string, Transition | object>;

export const stagger = {
  lines: 0.08,
  cards: 0.07,
  rows: 0.09,
} as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: dur.slow, ease: ease.out } },
};

export const maskUp: Variants = {
  hidden: { y: "110%" },
  visible: { y: "0%", transition: { duration: dur.hero, ease: ease.out } },
};

export const group = (childStagger: number = stagger.cards, delayChildren = 0): Variants => ({
  hidden: {},
  visible: { transition: { staggerChildren: childStagger, delayChildren } },
});

export const inView = { once: true, amount: 0.25, margin: "0px 0px -12% 0px" } as const;
