import { ArrowRight, CircleCheck, Clock3, Eye, Megaphone, Scale, ShieldCheck, Upload, Wallet } from "lucide-react";
import Link from "next/link";
import { Reveal, RevealGroup, RevealItem } from "./reveal";

const STATS = [
  { value: "$26M", unit: "per year", label: "found inside the leases of a 1,000-store retailer and put back to work" },
  { value: "29%", unit: "more traffic", label: "for a 30-store retailer, through channels it was already paying for" },
  { value: "5%", unit: "more sales", label: "for a 100-store retailer, from the same centers, the same leases" },
  { value: "$218K", unit: "per year", label: "saved by a 140-store retailer in hours, salaries and duplicate work" },
];

export function Proof() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20 md:py-28">
      <Reveal className="max-w-2xl">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">The math your lease already did</p>
        <h2 className="text-balance text-3xl font-semibold tracking-[-0.02em] md:text-4xl">These numbers came from real retailers. The money was already spent.</h2>
      </Reveal>
      <RevealGroup className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" as="ul">
        {STATS.map((s) => (
          <RevealItem key={s.value + s.unit} as="li" className="rounded-xl border border-line bg-bg-elev p-6">
            <p className="text-4xl font-semibold tracking-[-0.03em] tabular">{s.value}</p>
            <p className="mt-0.5 text-sm font-medium text-accent">{s.unit}</p>
            <p className="mt-3 text-sm text-pretty text-fg-muted">{s.label}</p>
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  );
}

const STEPS = [
  { icon: Upload, title: "Upload your campaign once.", body: "One form. Your creative, your dates, your stores. That is the last time you touch it." },
  { icon: Megaphone, title: "We send it to every center you're in.", body: "Each shopping center gets it in the format its team needs, on time, without a single email from you." },
  { icon: Eye, title: "You see what ran, where, and what it did.", body: "Traffic, clicks and posts per center. And a check that the center actually posted what you sent." },
];

export function HowItWorks() {
  return (
    <section className="border-y border-line bg-bg-elev">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <Reveal className="max-w-2xl">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">How it works</p>
          <h2 className="text-balance text-3xl font-semibold tracking-[-0.02em] md:text-4xl">Three steps. The first one is the only one you do.</h2>
        </Reveal>
        <RevealGroup className="mt-10 grid gap-4 md:grid-cols-3" as="ol">
          {STEPS.map((s, i) => (
            <RevealItem key={s.title} as="li" className="relative rounded-xl border border-line bg-bg p-6">
              <span className="absolute right-5 top-5 text-xs font-semibold tabular text-fg-subtle">0{i + 1}</span>
              <s.icon className="size-6 text-accent" />
              <h3 className="mt-4 text-lg font-semibold tracking-tight">{s.title}</h3>
              <p className="mt-2 text-sm text-pretty text-fg-muted">{s.body}</p>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}

const PILLARS = [
  { icon: Wallet, title: "Get back the traffic and sales you paid for", body: "Your campaign shows up where shoppers already look: the center's site, app, email and signs." },
  { icon: ShieldCheck, title: "Stop paying to promote your competitors", body: "When your slot sits empty, the center fills it with the store next door. On your dime." },
  { icon: Scale, title: "Pay less for your lease, or get more from it", body: "We show you exactly what marketing your lease charges for, so you can negotiate or use it." },
  { icon: CircleCheck, title: "Keep every campaign correct and current", body: "Wrong dates, old creative, a missed post. We catch it at every center, so your brand stays right." },
  { icon: Clock3, title: "Give your team their hours back", body: "One upload instead of dozens of emails. Days of work per campaign become minutes." },
];

export function Pillars() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20 md:py-28">
      <Reveal className="max-w-2xl">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">Five ways it pays</p>
        <h2 className="text-balance text-3xl font-semibold tracking-[-0.02em] md:text-4xl">Retailers call mall marketing "the most expensive gym membership in the world." We make you go.</h2>
      </Reveal>
      <RevealGroup className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" as="ul">
        {PILLARS.map((p) => (
          <RevealItem key={p.title} as="li" className="group rounded-xl border border-line bg-bg-elev p-6 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <p.icon className="size-5 text-accent" />
            <h3 className="mt-4 text-base font-semibold tracking-tight">{p.title}</h3>
            <p className="mt-2 text-sm text-pretty text-fg-muted">{p.body}</p>
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  );
}

export function FieldAgentBand({ checked, clean, changed, runId }: { checked: number; clean: number; changed: number; runId: string | null }) {
  return (
    <section className="border-y border-line bg-plum-800 text-white dark:bg-plum-900">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 md:grid-cols-2 md:items-center md:py-24">
        <Reveal>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-pink-300">We also check the centers' work</p>
          <h2 className="text-balance text-3xl font-semibold tracking-[-0.02em] md:text-4xl">Did the center actually post your campaign? Correctly? On time?</h2>
          <p className="mt-4 max-w-lg text-pretty text-base leading-relaxed text-plum-100">
            Field Agent walks every center's website the way a shopper would, records every promotion it finds, and comes back later to check that what was posted is still true. When something is missing, late or wrong, it names the store, the field and the date.
          </p>
          <Link href={runId ? `/app/verify/${runId}` : "/app"} className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-white underline-offset-4 hover:underline">
            Open a real verification report <ArrowRight className="size-4" />
          </Link>
        </Reveal>
        <Reveal delay={0.1} className="rounded-2xl border border-white/15 bg-white/5 p-6 backdrop-blur">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-plum-200">Live from this build · The Promenade Shops at Briargate</p>
          <dl className="mt-4 grid grid-cols-3 gap-4">
            <div>
              <dt className="text-xs text-plum-200">Checked</dt>
              <dd className="text-3xl font-semibold tabular">{checked}</dd>
            </div>
            <div>
              <dt className="text-xs text-plum-200">Still true</dt>
              <dd className="text-3xl font-semibold tabular text-emerald-300">{clean}</dd>
            </div>
            <div>
              <dt className="text-xs text-plum-200">Drifted</dt>
              <dd className="text-3xl font-semibold tabular text-pink-300">{changed}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-plum-200">Numbers come from the last verification run in this deployment. Sign in to see every promotion, field by field.</p>
        </Reveal>
      </div>
    </section>
  );
}

const QUOTES = [
  { who: "Courtney P.", role: "Senior Marketing Planner, Nordstrom Rack", logo: "nordstrom-rack", text: "Engagement Agents helps Nordstrom Rack streamline our local marketing outreach program and process, allowing our team to shift focus to other business needs. Their team is quick, flexible, efficient and responsive." },
  { who: "Justin B.", role: "Senior Marketing & Communications Manager, UNOde50", logo: "uno-de-50", text: "During our pilot, Engagement Agents helped UNOde50 increase store traffic by 29%. We now rely on Engagement Agents to drive more traffic and sales to our North American store locations." },
  { who: "Daniel P.", role: "Senior Director, Marketing, WIRELESSWAVE", logo: "wirelesswave", text: "With 250+ stores across two retail banners, it would have been impossible to engage shopping centres' marketing channels without significant people and financial resources. What would take days or weeks now takes minutes." },
  { who: "Jennifer B.", role: "President, Stitch It", logo: "stitch-it", text: "We contribute a lot of dollars to our shopping centres' marketing funds every month but were not taking full advantage of resources provided. It's so much easier with Engagement Agents! Now it's a one-stop process." },
  { who: "Jordan K.", role: "Marketing Coordinator, Indochino", logo: "indochino", text: "Engaging with our shopping center marketing partners is important to drive awareness of Indochino and more traffic & sales. Engagement Agents helps us achieve this with ease!" },
  { who: "Michael F.", role: "Marketing Communications, Bluenotes", logo: "bluenotes", text: "Engagement Agents makes it easy to promote Bluenotes marketing campaigns throughout our shopping centres' marketing channels, in order to drive more traffic and sales to Bluenotes!" },
];

export function Testimonials() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20 md:py-28">
      <Reveal className="max-w-2xl">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">In their words</p>
        <h2 className="text-balance text-3xl font-semibold tracking-[-0.02em] md:text-4xl">What retail marketing teams say after the first campaign.</h2>
      </Reveal>
      <RevealGroup className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3" as="ul">
        {QUOTES.map((q) => (
          <RevealItem key={q.who} as="li" className="flex flex-col rounded-xl border border-line bg-bg-elev p-6">
            <img src={`/ea/logos/${q.logo}.png`} alt="" className="h-6 w-auto self-start opacity-80 dark:invert" loading="lazy" />
            <blockquote className="mt-4 flex-1 text-pretty text-sm leading-relaxed">“{q.text}”</blockquote>
            <footer className="mt-4 text-xs text-fg-muted">
              <span className="font-medium text-fg">{q.who}</span> · {q.role}
            </footer>
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  );
}

export function Founder() {
  return (
    <section className="border-y border-line bg-bg-elev">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-16 md:flex-row md:items-center md:py-20">
        <Reveal className="shrink-0">
          <img src="/ea/sean.jpg" alt="Sean Snyder, President of Engagement Agents" className="size-24 rounded-full object-cover ring-4 ring-bg" />
        </Reveal>
        <Reveal delay={0.05} className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">Started by a retailer</p>
          <p className="mt-3 text-pretty text-lg leading-relaxed">
            “I ran marketing for 85 shopping-center stores. Every campaign meant 85 packages, 85 email threads, and no way to know what any center actually did with them. We built Engagement Agents so no retailer has to do that again.”
          </p>
          <p className="mt-3 text-sm text-fg-muted">Sean Snyder, President · Dallas, TX and Hamilton, ON · since 2016</p>
        </Reveal>
      </div>
    </section>
  );
}

export function CtaBand() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20 md:py-28">
      <Reveal className="rounded-2xl border border-line bg-gradient-to-br from-plum-800 to-plum-900 p-10 text-white md:p-14">
        <div className="flex flex-col items-start gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <h2 className="text-balance text-3xl font-semibold tracking-[-0.02em] md:text-4xl">See how much of your lease is buying nothing.</h2>
            <p className="mt-3 text-pretty text-base text-plum-100">A 30-minute walkthrough with your own store list. We'll show you the channels, the cost, and what one campaign looks like across every center.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a href="https://www.engagementagents.com/book-a-demo" className="inline-flex h-12 items-center gap-2 rounded-md bg-accent px-6 text-sm font-semibold text-accent-fg shadow-sm transition-[transform,background-color] duration-150 hover:bg-pink-400 active:translate-y-px">
              Book a demo <ArrowRight className="size-4" />
            </a>
            <a href="mailto:engage@engagementagents.com" className="inline-flex h-12 items-center rounded-md border border-white/25 px-6 text-sm font-medium transition-colors duration-150 hover:bg-white/10">
              engage@engagementagents.com
            </a>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-line bg-bg-elev">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 text-sm md:grid-cols-4">
        <div>
          <img src="/ea/logo.png" alt="Engagement Agents" className="h-7 w-auto dark:invert" />
          <p className="mt-3 max-w-xs text-pretty text-xs text-fg-muted">The retailer's platform for the marketing already inside your leases.</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-muted">United States</p>
          <p className="mt-2 text-fg-muted">311 N Market St, Suite 200<br />Dallas, TX 75202</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-muted">Canada</p>
          <p className="mt-2 text-fg-muted">24 Eugene St.<br />Hamilton, ON L8H 2R3</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-muted">Talk to us</p>
          <p className="mt-2 text-fg-muted">
            <a href="tel:+14165777326" className="hover:text-fg">1 416 577 7326</a>
            <br />
            <a href="mailto:engage@engagementagents.com" className="hover:text-fg">engage@engagementagents.com</a>
          </p>
          <p className="mt-3 text-xs text-fg-subtle">
            <Link href="/app" className="hover:text-fg">Platform</Link> · <a href="https://www.engagementagents.com/privacy-policy" className="hover:text-fg">Privacy</a> · <a href="https://www.engagementagents.com/terms-conditions" className="hover:text-fg">Terms</a>
          </p>
        </div>
      </div>
      <p className="border-t border-line px-6 py-4 text-center text-[11px] text-fg-subtle">
        This page is a design proposal built as part of a take-home exercise. Customer names, quotes and figures are from engagementagents.com.
      </p>
    </footer>
  );
}
