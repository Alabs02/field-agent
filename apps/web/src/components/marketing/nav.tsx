"use client";

import Link from "next/link";
import { Menu, X, ArrowUpRight } from "lucide-react";
import { useEffect, useRef } from "react";
import { DEMO_URL, NAV_LINKS } from "./content";

export function MarketingNav() {
  const menu = useRef<HTMLDetailsElement>(null);
  function closeMenu() {
    if (menu.current) menu.current.open = false;
  }
  useEffect(() => {
    const dismissOutside = (event: Event) => {
      if (
        menu.current?.open &&
        event.target instanceof Node &&
        !menu.current.contains(event.target)
      ) {
        closeMenu();
      }
    };
    document.addEventListener("pointerdown", dismissOutside);
    document.addEventListener("focusin", dismissOutside);
    return () => {
      document.removeEventListener("pointerdown", dismissOutside);
      document.removeEventListener("focusin", dismissOutside);
    };
  }, []);
  return (
    <header className="ea-header">
      <a href="#main" className="ea-skip">
        Skip to content
      </a>
      <div className="ea-wrap ea-header-inner">
        <a href="#top" aria-label="Engagement Agents home" className="ea-wordmark">
          <img src="/ea/logo.png" alt="Engagement Agents" width={330} height={33} />
        </a>
        <nav className="ea-desktop-nav" aria-label="Main navigation">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>
        <div className="ea-nav-actions">
          <Link href="/login" className="ea-login">
            Login
          </Link>
          <a href={DEMO_URL} className="ea-button ea-button-primary ea-nav-demo">
            Book a Demo <ArrowUpRight size={15} aria-hidden="true" />
          </a>
        </div>
        <details
          className="ea-mobile-menu"
          ref={menu}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              closeMenu();
              menu.current?.querySelector("summary")?.focus();
            }
          }}
        >
          <summary aria-label="Navigation menu">
            <Menu className="ea-when-closed" size={22} />
            <X className="ea-when-open" size={22} />
          </summary>
          <nav
            aria-label="Mobile navigation"
            onClick={(event) => {
              if ((event.target as HTMLElement).closest("a")) closeMenu();
            }}
          >
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href}>
                {link.label}
                <ArrowUpRight size={16} aria-hidden="true" />
              </a>
            ))}
            <a href="#stories">
              Testimonials <ArrowUpRight size={16} aria-hidden="true" />
            </a>
            <a href={DEMO_URL} className="ea-mobile-demo">
              Book a Demo <ArrowUpRight size={16} aria-hidden="true" />
            </a>
          </nav>
        </details>
      </div>
    </header>
  );
}
