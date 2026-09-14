import { describe, expect, it } from "vitest";
import { parseListing } from "../src/adapters/briargate/listing.js";
import { ParseError } from "../src/errors.js";
import { BASE, canonicalize, fixture } from "./helpers.js";

const LISTING_URL = `${BASE}/sales/`;

describe("parseListing", () => {
  const rows = parseListing(fixture("listing.html"), canonicalize, LISTING_URL);

  it("parses every deal-row on the page", () => {
    expect(rows.length).toBeGreaterThanOrEqual(20);
    expect(new Set(rows.map((r) => r.sourceId)).size).toBe(rows.length);
  });

  it("extracts the known Altar'd State promotion with its collection and store id", () => {
    const row = rows.find((r) => r.sourceId === "3444509");
    expect(row).toBeDefined();
    expect(row).toMatchObject({
      title: "BOGO 50% Off Dresses",
      brandName: "Altar'd State",
      brandSourceId: "1035999",
      collection: "deals",
      detailUrl: `${BASE}/deals/3444509/`,
    });
    expect(row!.imageUrl).toMatch(/^https:\/\/cdn-files\.eu\.placewise\.com\//);
    expect(row!.startSerial).toBeGreaterThan(46000);
    expect(row!.endSerial).toBeGreaterThanOrEqual(row!.startSerial!);
  });

  it("maps all three collections and never leaves a row as 'other'", () => {
    const collections = new Set(rows.map((r) => r.collection));
    expect(collections.has("deals")).toBe(true);
    expect(collections.has("other")).toBe(false);
  });

  it("fails loudly on a 200 page with no rows (the quiet-nothing case)", () => {
    expect(() => parseListing("<html><body><main></main></body></html>", canonicalize, LISTING_URL)).toThrow(
      ParseError,
    );
  });
});
