import Link from "next/link";
import { ThemeToggle } from "@/components/shared/theme-toggle";

export function MarketingNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <a href="#top" className="flex items-center gap-2">
          <img src="/ea/logo.png" alt="Engagement Agents" className="h-6 w-auto dark:invert" />
        </a>
        <nav className="hidden items-center gap-7 text-sm text-fg-muted md:flex" aria-label="Sections">
          <a href="#proof" className="hover:text-fg">Results</a>
          <a href="#how" className="hover:text-fg">How it works</a>
          <a href="#why" className="hover:text-fg">Why</a>
          <a href="#verify" className="hover:text-fg">Verification</a>
          <a href="#stories" className="hover:text-fg">Stories</a>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/app" className="hidden h-9 items-center rounded-md border border-line-strong px-3 text-sm font-medium hover:bg-bg-muted sm:inline-flex">
            Platform
          </Link>
          <a href="https://www.engagementagents.com/book-a-demo" className="inline-flex h-9 items-center rounded-md bg-accent px-3 text-sm font-semibold text-accent-fg hover:bg-pink-600">
            Book a demo
          </a>
        </div>
      </div>
    </header>
  );
}
