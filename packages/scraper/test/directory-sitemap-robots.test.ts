import { describe, expect, it } from "vitest";
import { parseDirectory } from "../src/adapters/briargate/directory.js";
import { parseSitemap } from "../src/adapters/briargate/sitemap.js";
import { effectiveDelayMs, parseRobots } from "../src/robots.js";
import { BASE, canonicalize, fixture } from "./helpers.js";

describe("parseDirectory", () => {
  const stubs = parseDirectory(fixture("directory.html"), canonicalize);

  it("lists every store card with categories and deal flags", () => {
    expect(stubs.length).toBeGreaterThanOrEqual(40);
    const altard = stubs.find((s) => s.sourceId === "1035999");
    expect(altard).toMatchObject({
      name: "Altar'd State",
      slug: "altard-state",
      sourceUrl: `${BASE}/stores/1035999-altard-state/`,
      hasDeals: true,
    });
    expect(altard!.categories).toContain("Womens Apparel");
    expect(altard!.categories).not.toContain("Now Open");
  });
});

describe("parseSitemap", () => {
  const map = parseSitemap(fixture("sitemap.xml"), canonicalize);

  it("indexes deals and stores with lastmod, and expires on deals", () => {
    const deals = [...map.keys()].filter((u) => u.includes("/deals/"));
    const stores = [...map.keys()].filter((u) => u.includes("/stores/"));
    expect(deals.length).toBeGreaterThanOrEqual(25);
    expect(stores.length).toBeGreaterThanOrEqual(40);
    // Note: deal 3444509 was live on the listing but absent from the sitemap on
    // 2026-09-14, which is why the listing, not the sitemap, is the source of truth.
    const entry = map.get(deals[0]!);
    expect(entry?.lastmod).toBeInstanceOf(Date);
    expect(entry?.expires).toBeInstanceOf(Date);
  });

  it("canonicalizes relative and apex-host locs", () => {
    expect(map.has(`${BASE}/directory/`)).toBe(true);
  });
});

describe("robots", () => {
  const ua = "FieldAgentBot/0.1 (+https://github.com/Alabs02/field-agent)";
  const rules = parseRobots(`${BASE}/robots.txt`, fixture("robots.txt"), ua);

  it("reads Crawl-delay: 60 and the disallow list", () => {
    expect(rules.crawlDelayMs).toBe(60_000);
    expect(rules.isAllowed(`${BASE}/sales/`)).toBe(true);
    expect(rules.isAllowed(`${BASE}/deals/3444509/`)).toBe(true);
    expect(rules.isAllowed(`${BASE}/search/deals/`)).toBe(false);
    expect(rules.isAllowed(`${BASE}/admin/`)).toBe(false);
  });

  it("uses the stated delay as a floor only when asked to respect it", () => {
    expect(effectiveDelayMs(2000, 60_000, true)).toBe(60_000);
    expect(effectiveDelayMs(2000, 60_000, false)).toBe(2000);
    expect(effectiveDelayMs(2000, null, true)).toBe(2000);
    expect(effectiveDelayMs(90_000, 60_000, true)).toBe(90_000);
  });
});
