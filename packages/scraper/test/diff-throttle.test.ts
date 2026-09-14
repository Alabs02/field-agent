import { describe, expect, it } from "vitest";
import { detailDiff, listingFlags, type ComparablePromotion } from "../src/diff.js";
import { MemoryThrottle } from "../src/throttle.js";
import { TZ } from "./helpers.js";

const base: ComparablePromotion = {
  title: "BOGO 50% Off Dresses",
  description: "Don't miss out! Shop in store and enjoy buy one, get one 50% off dresses.",
  imageUrl: "https://cdn-files.eu.placewise.com/f/ABC?transform=resize=width:200",
  startsAt: new Date("2026-09-13T06:00:00Z"),
  endsAt: new Date("2026-09-15T05:59:59Z"),
  brandSourceId: "1035999",
  collection: "deals",
};

describe("detailDiff", () => {
  it("reports nothing for noise below the line", () => {
    const fresh: ComparablePromotion = {
      ...base,
      title: "  BOGO 50% Off  Dresses ",
      description: "Don&#8217;t miss out!  Shop in store and enjoy buy one, get one 50% off dresses.",
      imageUrl: "https://cdn-files.eu.placewise.com/f/ABC?transform=resize=width:800&cb=9",
      endsAt: new Date("2026-09-15T03:00:00Z"), // same Denver day, different time
    };
    expect(detailDiff(base, fresh, TZ)).toEqual([]);
  });

  it("names each changed field with before and after", () => {
    const fresh: ComparablePromotion = {
      ...base,
      title: "BOGO 40% Off Dresses",
      imageUrl: "https://cdn-files.eu.placewise.com/f/XYZ",
      endsAt: new Date("2026-09-21T05:59:59Z"),
      collection: "style_notes",
    };
    const changes = detailDiff(base, fresh, TZ);
    expect(changes.map((c) => c.field)).toEqual(["title", "imageUrl", "endsOn", "collection"]);
    expect(changes[0]).toEqual({ field: "title", before: "BOGO 50% Off Dresses", after: "BOGO 40% Off Dresses" });
    expect(changes[2]).toEqual({ field: "endsOn", before: "2026-09-14", after: "2026-09-20" });
  });

  it("treats null <-> value as a change and truncates long descriptions", () => {
    const long = "x".repeat(400);
    const changes = detailDiff({ ...base, endsAt: null }, { ...base, description: long }, TZ);
    expect(changes.find((c) => c.field === "description")).toMatchObject({ truncated: true });
    expect(changes.find((c) => c.field === "endsOn")).toEqual({ field: "endsOn", before: null, after: "2026-09-14" });
  });
});

describe("listingFlags", () => {
  it("flags title/brand/image/collection/end-day differences without asserting a change", () => {
    const flags = listingFlags(
      base,
      {
        sourceId: "3444509",
        title: "BOGO 40% Off Dresses",
        brandName: "Altar'd State",
        brandSourceId: "1035999",
        imageUrl: base.imageUrl,
        startSerial: 46278,
        endSerial: 46285,
        collection: "deals",
        detailUrl: "https://www.thepromenadeshopsatbriargate.com/deals/3444509/",
        endsText: null,
      },
      "2026-09-20",
      TZ,
    );
    expect(flags).toEqual(["title", "endsOn"]);
  });
});

describe("MemoryThrottle", () => {
  it("spaces requests per host and lets other hosts through", async () => {
    let t = 0;
    const throttle = new MemoryThrottle(1000, () => t);
    await throttle.acquire("a.com"); // t=0, next 1000
    t = 500;
    await throttle.acquire("b.com"); // different host, immediate
    let resolved = false;
    const p = throttle.acquire("a.com").then(() => (resolved = true));
    await new Promise((r) => setTimeout(r, 20));
    expect(resolved).toBe(false);
    t = 1000;
    await p;
    expect(resolved).toBe(true);
  });

  it("aborts a pending wait", async () => {
    const throttle = new MemoryThrottle(60_000);
    await throttle.acquire("a.com");
    const ac = new AbortController();
    const p = throttle.acquire("a.com", ac.signal);
    ac.abort(new Error("stop"));
    await expect(p).rejects.toMatchObject({ code: "aborted" });
  });
});
