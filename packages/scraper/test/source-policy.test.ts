import { describe, expect, it } from "vitest";
import { isChallengePage, retryAfterUntil } from "../src/source-policy.js";
import { fixture } from "./helpers.js";

describe("Retry-After", () => {
  const now = Date.parse("2026-09-15T12:00:00Z");
  it("accepts delay-seconds", () => {
    expect(retryAfterUntil("120", now)).toBe(now + 120_000);
    expect(retryAfterUntil(" 1.5 ", now)).toBe(now + 1_500);
  });
  it("accepts an HTTP-date and never returns a time in the past", () => {
    expect(retryAfterUntil("Tue, 15 Sep 2026 12:05:00 GMT", now)).toBe(now + 300_000);
    expect(retryAfterUntil("Tue, 15 Sep 2026 11:00:00 GMT", now)).toBe(now);
  });
  it("falls back to a conservative minute for a missing or malformed header", () => {
    expect(retryAfterUntil(null, now)).toBe(now + 60_000);
    expect(retryAfterUntil("soon", now)).toBe(now + 60_000);
  });
});

describe("challenge detection", () => {
  it("classifies interstitial and CAPTCHA pages as blocked", () => {
    expect(isChallengePage('<html><head><title>Just a moment...</title></head><body><div id="cf-chl-widget"></div></body></html>')).toBe(true);
    expect(isChallengePage('<html><title>Attention Required! | Cloudflare</title></html>')).toBe(true);
    expect(isChallengePage('<script src="https://ct.captcha-delivery.com/c.js"></script>')).toBe(true);
    expect(isChallengePage("<p>Please verify you are human to continue</p>")).toBe(true);
  });
  it("does not flag the portal's own listing, which mentions none of the markers", () => {
    expect(isChallengePage(fixture("listing.html"))).toBe(false);
  });
});
