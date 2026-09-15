import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { ThemeProvider } from "next-themes";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster } from "sonner";
import "./globals.css";

// favicon.ico and icon.png next to this file are served by the App Router file
// conventions; no `icons` entry is needed here.
const siteUrl = process.env.NEXT_PUBLIC_WEB_URL || "https://field-agent.up.railway.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "field-agent", template: "%s · field-agent" },
  description: "An engagement agent that walks the mall for you: promotions scraped, verified, and served.",
  openGraph: {
    type: "website",
    siteName: "field-agent",
    url: "/",
    title: "field-agent · Promotions Aggregator (Single-Mall MVP)",
    description: "Promotions scraped, verified, and served. A take-home for Engagement Agents by Alabura.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-dvh antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <NuqsAdapter>{children}</NuqsAdapter>
          <Toaster richColors position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
