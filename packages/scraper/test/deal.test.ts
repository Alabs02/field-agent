import { describe, expect, it } from "vitest";
import type { ScrapedListingRow } from "@field-agent/shared";
import { parseDealPage } from "../src/adapters/briargate/deal.js";
import { dayInZone } from "../src/dates.js";
import { BASE, canonicalize, fixture, TZ } from "./helpers.js";

const URL = `${BASE}/deals/3444509/`;
const row: ScrapedListingRow = {
  sourceId: "3444509",
  title: "BOGO 50% Off Dresses",
  brandName: "Altar'd State",
  brandSourceId: "1035999",
  imageUrl: null,
  startSerial: 46278.5372,
  endSerial: 46279.53721,
  collection: "deals",
  detailUrl: URL,
  endsText: "Ends Today",
};

describe("parseDealPage", () => {
  const parsed = parseDealPage(fixture("deal-3444509.html"), URL, row, canonicalize);

  it("reads name, dates, image, and canonical url from JSON-LD", () => {
    expect(parsed.jsonLdMissing).toBe(false);
    const p = parsed.promotion;
    expect(p.title).toBe("BOGO 50% Off Dresses");
    expect(p.canonicalUrl).toBe(URL);
    expect(p.imageUrl).toMatch(/^https:\/\/cdn-files\.eu\.placewise\.com\//);
    expect(dayInZone(new Date(p.startsAt!), TZ)).toBe("2026-09-13");
    expect(dayInZone(new Date(p.endsAt!), TZ)).toBe("2026-09-14");
  });

  it("keeps a sanitized HTML description and a normalized plain-text one", () => {
    const p = parsed.promotion;
    expect(p.description).toContain("buy one, get one 50% off dresses");
    expect(p.descriptionHtml).toMatch(/^<p>/);
    expect(p.descriptionHtml).not.toMatch(/<script/i);
  });

  it("finds the brand's store page and lifts the embedded store info as a fallback", () => {
    expect(parsed.promotion.brandStoreUrl).toBe(`${BASE}/stores/1035999-altard-state/`);
    expect(parsed.brandFallback).toMatchObject({
      sourceId: "1035999",
      slug: "altard-state",
      name: "Altar'd State",
      websiteUrl: "https://www.altardstate.com/",
      phone: "(719) 345-5117",
    });
    expect(parsed.brandFallback?.hours?.mon).toEqual({ open: "10:00", close: "20:00" });
    expect(parsed.brandFallback?.hours?.sun).toEqual({ open: "11:00", close: "18:00" });
  });

  it("survives a page without JSON-LD by falling back to the DOM", () => {
    const html = fixture("deal-3444509.html").replace(/<script type=["']application\/ld\+json["']>[\s\S]*?<\/script>/g, "");
    const p = parseDealPage(html, URL, row, canonicalize);
    expect(p.jsonLdMissing).toBe(true);
    expect(p.promotion.title).toBe("BOGO 50% Off Dresses");
    expect(p.promotion.startsAt).toBeNull();
  });
});
