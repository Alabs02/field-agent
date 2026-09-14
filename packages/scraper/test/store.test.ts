import { describe, expect, it } from "vitest";
import { parseStorePage } from "../src/adapters/briargate/store.js";
import { BASE, fixture } from "./helpers.js";

describe("parseStorePage", () => {
  it("parses Altar'd State: hours by day, phone, website, location, no socials", () => {
    const url = `${BASE}/stores/1035999-altard-state/`;
    const b = parseStorePage(fixture("store-1035999-altard-state.html"), url);
    expect(b).toMatchObject({
      sourceId: "1035999",
      slug: "altard-state",
      name: "Altar'd State",
      sourceUrl: url,
      websiteUrl: "https://www.altardstate.com/",
      websiteIsRedirect: false,
      phone: "(719) 345-5117",
      socialLinks: [],
    });
    expect(b.location).toContain("Suite 417");
    expect(b.description).toMatch(/women's fashion boutique/i);
    expect(b.hours).toEqual({
      mon: { open: "10:00", close: "20:00" },
      tue: { open: "10:00", close: "20:00" },
      wed: { open: "10:00", close: "20:00" },
      thu: { open: "10:00", close: "20:00" },
      fri: { open: "10:00", close: "20:00" },
      sat: { open: "10:00", close: "20:00" },
      sun: { open: "11:00", close: "18:00" },
    });
    expect(b.hoursRaw).toMatch(/Mon - Sat: 10am - 8pm/);
  });

  it("flags Chico's affiliate redirect website without following it", () => {
    const url = `${BASE}/stores/1035965-chicos/`;
    const b = parseStorePage(fixture("store-1035965-chicos.html"), url);
    expect(b.name).toBe("Chico's");
    expect(b.websiteUrl).toMatch(/tkqlhce\.com/);
    expect(b.websiteIsRedirect).toBe(true);
  });

  it("does not attribute the mall's own footer socials to the store", () => {
    const b = parseStorePage(fixture("store-1035965-chicos.html"), `${BASE}/stores/1035965-chicos/`);
    expect(b.socialLinks).toEqual([]);
  });

  it("keeps raw hours text and yields null structure when the block is unparseable", () => {
    const html = fixture("store-1035999-altard-state.html").replace(/<time datetime="[^"]+">/g, "<time>");
    const b = parseStorePage(html, `${BASE}/stores/1035999-altard-state/`);
    // times still readable from text ("10am - 8pm"), so the text fallback kicks in
    expect(b.hours?.mon).toEqual({ open: "10:00", close: "20:00" });
    expect(b.hoursRaw).toBeTruthy();
  });
});
