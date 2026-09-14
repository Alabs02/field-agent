import { MotionConfig } from "motion/react";
import { paginated, RunListItemSchema } from "@field-agent/shared";
import { Hero } from "@/components/marketing/hero";
import { LogoMarquee } from "@/components/marketing/logo-marquee";
import { MarketingNav } from "@/components/marketing/nav";
import { CtaBand, FieldAgentBand, Founder, HowItWorks, MarketingFooter, Pillars, Proof, Testimonials } from "@/components/marketing/sections";
import { apiFetch } from "@/lib/api";

export const metadata = {
  title: "Engagement Agents · Get back the marketing you already pay for",
  description: "Every lease funds the shopping center's website, app, email, social and signage. Engagement Agents puts your campaigns in every channel you're already paying for, from one place.",
};

export default async function Home() {
  // The verification band shows real numbers from this deployment; nothing here is invented.
  const lastVerify = await apiFetch("/runs", paginated(RunListItemSchema), { searchParams: { type: "verify", pageSize: 5 } })
    .then((r) => r.items.find((i) => i.type === "verify" && (i.status === "completed" || i.status === "completed_with_errors")))
    .catch(() => undefined);
  const counts = lastVerify?.type === "verify" ? lastVerify.counts : null;

  return (
    <MotionConfig reducedMotion="user">
      <div id="top" className="bg-bg text-fg">
        <MarketingNav />
        <Hero />
        <LogoMarquee />
        <div id="proof">
          <Proof />
        </div>
        <div id="how">
          <HowItWorks />
        </div>
        <div id="why">
          <Pillars />
        </div>
        <div id="verify">
          <FieldAgentBand checked={counts?.checked ?? 0} clean={counts?.clean ?? 0} changed={counts ? counts.changed + counts.missingAtSource : 0} runId={lastVerify?.id ?? null} />
        </div>
        <div id="stories">
          <Testimonials />
        </div>
        <Founder />
        <CtaBand />
        <MarketingFooter />
      </div>
    </MotionConfig>
  );
}
