import type { Metadata } from "next";
import { Hero } from "@/components/marketing/hero";
import { MarketingNav } from "@/components/marketing/nav";
import {
  CtaBand,
  Features,
  Founder,
  HowItWorks,
  Insights,
  MarketingFooter,
  Pillars,
  Proof,
  Testimonials,
} from "@/components/marketing/sections";
import "./marketing.css";

const title = "Engagement Agents · Make your retail marketing work harder";
const description =
  "Connect your campaigns with your shopping centers’ marketing channels. Engagement Agents helps retailers drive traffic and sales through opportunities already inside their leases.";
export const metadata: Metadata = {
  title: { absolute: title },
  description,
  openGraph: {
    title,
    description,
    siteName: "Engagement Agents",
    type: "website",
    url: "/",
    images: [
      {
        url: "/ea-social",
        width: 1200,
        height: 630,
        alt: "Engagement Agents — Get more from the retail marketing you already pay for",
      },
    ],
  },
  twitter: { card: "summary_large_image", title, description, images: ["/ea-social"] },
};

export default function Home() {
  return (
    <div id="top" className="ea-site">
      <MarketingNav />
      <main id="main" tabIndex={-1}>
        <Hero />
        <Proof />
        <Pillars />
        <HowItWorks />
        <Features />
        <Testimonials />
        <Founder />
        <Insights />
        <CtaBand />
      </main>
      <MarketingFooter />
    </div>
  );
}
