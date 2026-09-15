import type { Metadata } from "next";
import { Lato, Montserrat } from "next/font/google";
import { GeistMono } from "geist/font/mono";
import { ThemeProvider } from "next-themes";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster } from "sonner";
import "./globals.css";

// Engagement Agents' own pairing: Montserrat for display, Lato for text. Self-hosted by
// next/font, so no request leaves for Google at runtime. Geist Mono stays for code.
const montserrat = Montserrat({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-montserrat", display: "swap" });
const lato = Lato({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-lato", display: "swap" });

// icon.svg, apple-icon.png and opengraph-image.tsx next to this file are served by the
// App Router file conventions; no `icons` entry is needed here.
const siteUrl = process.env.NEXT_PUBLIC_WEB_URL || "https://field-agent.up.railway.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Field Agent", template: "%s · Field Agent" },
  description: "Field Agent by Engagement Agents: promotions scraped, verified, and served, with the evidence.",
  openGraph: {
    type: "website",
    siteName: "Field Agent",
    url: "/",
    title: "Field Agent · Promotions Aggregator (Single-Mall MVP)",
    description: "Promotions scraped, verified, and served. A take-home for Engagement Agents by Alabura.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${montserrat.variable} ${lato.variable} ${GeistMono.variable}`}>
      <body className="min-h-dvh antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <NuqsAdapter>{children}</NuqsAdapter>
          <Toaster richColors position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
