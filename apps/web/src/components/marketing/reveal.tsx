"use client";

import { useAnimate, useReducedMotion } from "motion/react";
import { useEffect, type ReactNode } from "react";
import { dur, ease, stagger } from "@/lib/motion";

/** Progressive enhancement: the server-rendered content is never hidden. */
export function Reveal({
  children,
  className,
  hero = false,
  sequence = false,
}: {
  children: ReactNode;
  className?: string;
  hero?: boolean;
  sequence?: boolean;
}) {
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce || !scope.current || !window.IntersectionObserver) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        if (sequence) {
          animate(
            ".ea-process-marker",
            { opacity: [0.35, 1] },
            { duration: dur.slow, ease: ease.out, delay: (i) => i * stagger.rows },
          );
        } else {
          animate(
            scope.current,
            { opacity: [0.75, 1], y: [hero ? 16 : 8, 0] },
            { duration: hero ? dur.hero : dur.slow, ease: ease.out },
          );
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(scope.current);
    return () => observer.disconnect();
  }, [animate, hero, reduce, scope, sequence]);
  return (
    <div ref={scope} className={className}>
      {children}
    </div>
  );
}
