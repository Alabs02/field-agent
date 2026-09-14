import { describe, expect, it } from "vitest";
import { dayInZone, excelSerialToEndOfDay, excelSerialToStartOfDay, parseJsonLdDate } from "../src/dates.js";
import { hashFields, imageKey, normalizeText } from "../src/normalize.js";
import { promotionFingerprint } from "../src/fingerprint.js";
import { makeCanonicalizer, isAffiliateUrl } from "../src/url.js";
import { TZ } from "./helpers.js";

describe("dates", () => {
  it("converts the listing's Excel serial to a Denver calendar day", () => {
    expect(dayInZone(excelSerialToStartOfDay(46278.5372, TZ), TZ)).toBe("2026-09-13");
    expect(dayInZone(excelSerialToEndOfDay(46279.53721, TZ), TZ)).toBe("2026-09-14");
    expect(dayInZone(excelSerialToStartOfDay(25569, TZ), TZ)).toBe("1970-01-01");
  });

  it("parses the portal's JSON-LD date shape with its offset", () => {
    const d = parseJsonLdDate("September, 14 2026 23:59:59 -0600");
    expect(d?.toISOString()).toBe("2026-09-15T05:59:59.000Z");
    expect(dayInZone(d, TZ)).toBe("2026-09-14");
  });

  it("returns null for garbage", () => {
    expect(parseJsonLdDate("soon")).toBeNull();
    expect(parseJsonLdDate(undefined)).toBeNull();
  });
});

describe("normalizeText", () => {
  it("decodes entities, straightens quotes, collapses whitespace, never returns empty", () => {
    expect(normalizeText("  Altar&#8217;d State  \r\n ")).toBe("Altar'd State");
    expect(normalizeText("<p>Hello&nbsp;<b>world</b></p>")).toBe("Hello world");
    expect(normalizeText("   ")).toBeNull();
    expect(normalizeText(null)).toBeNull();
  });
});

describe("imageKey", () => {
  it("ignores CDN transforms and query strings but not image identity", () => {
    const a = "https://cdn-files.eu.placewise.com/f/ABC?transform=output=format:webp/resize=width:200";
    const b = "https://cdn-files.eu.placewise.com/f/ABC?transform=output=format:webp/resize=width:400&v=2";
    const c = "https://cdn-files.eu.placewise.com/f/XYZ";
    expect(imageKey(a)).toBe(imageKey(b));
    expect(imageKey(a)).not.toBe(imageKey(c));
    expect(imageKey(null)).toBeNull();
  });
});

describe("fingerprint + hash", () => {
  it("is stable across whitespace/case noise and sensitive to end day", () => {
    const a = promotionFingerprint("BOGO 50% Off Dresses", "1035999", "2026-09-14");
    const b = promotionFingerprint("  bogo 50% off   dresses ", "1035999", "2026-09-14");
    const c = promotionFingerprint("BOGO 50% Off Dresses", "1035999", "2026-09-20");
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it("hashFields treats null and undefined alike and ignores key order", () => {
    expect(hashFields({ a: 1, b: null })).toBe(hashFields({ b: undefined, a: 1 }));
  });
});

describe("url", () => {
  const canonicalize = makeCanonicalizer("https://thepromenadeshopsatbriargate.com");

  it("forces www, https, trailing slash and drops hash/query on portal urls", () => {
    expect(canonicalize("http://thepromenadeshopsatbriargate.com/sales")).toBe(
      "https://www.thepromenadeshopsatbriargate.com/sales/",
    );
    expect(canonicalize("/deals/3444509/#x?y=1")).toBe("https://www.thepromenadeshopsatbriargate.com/deals/3444509/");
    expect(canonicalize("/sitemap.xml")).toBe("https://www.thepromenadeshopsatbriargate.com/sitemap.xml");
  });

  it("leaves external urls untouched", () => {
    expect(canonicalize("https://www.altardstate.com/")).toBe("https://www.altardstate.com/");
  });

  it("recognizes affiliate hosts", () => {
    expect(isAffiliateUrl("https://www.tkqlhce.com/click-7274402-11428273")).toBe(true);
    expect(isAffiliateUrl("https://www.ulta.com/")).toBe(false);
  });
});

describe("affiliate patterns", () => {
  it("catches Impact, FlexLinks, ShopStyle and CJ links seen on the portal", () => {
    for (const u of [
      "https://fabletics.fjbu.net/V0JqE",
      "https://track.flexlinkspro.com/g.ashx?foid=1.2417",
      "https://shopstyle.it/l/uLiD",
      "https://www.tkqlhce.com/click-7274402-11428273",
    ])
      expect(isAffiliateUrl(u)).toBe(true);
    expect(isAffiliateUrl("https://www.williams-sonoma.com/")).toBe(false);
  });
});
