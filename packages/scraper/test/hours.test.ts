import * as cheerio from "cheerio";
import { describe, expect, it } from "vitest";
import { parseHours } from "../src/adapters/briargate/hours.js";

const wrap = (items: string) =>
  `<div class="component-store-info"><ul class="opening-hours">${items}</ul></div>`;

function run(items: string) {
  const $ = cheerio.load(wrap(items));
  return parseHours($, $(".component-store-info"));
}

describe("parseHours", () => {
  it("expands a day range and handles Closed", () => {
    const { hours, hoursRaw } = run(`
      <li><span class="label"><time>Mon</time>&nbsp;–⁠&nbsp;<time>Fri</time>:&nbsp;</span><span class="value"><time datetime="10:00">10am</time>&nbsp;–⁠&nbsp;<time datetime="21:00">9pm</time></span></li>
      <li><span class="label">Sat:&nbsp;</span><span class="value"><time datetime="10:00">10am</time>&nbsp;–⁠&nbsp;<time datetime="18:00">6pm</time></span></li>
      <li><span class="label">Sun:&nbsp;</span><span class="value">Closed</span></li>`);
    expect(hours).toEqual({
      mon: { open: "10:00", close: "21:00" },
      tue: { open: "10:00", close: "21:00" },
      wed: { open: "10:00", close: "21:00" },
      thu: { open: "10:00", close: "21:00" },
      fri: { open: "10:00", close: "21:00" },
      sat: { open: "10:00", close: "18:00" },
      sun: null,
    });
    expect(hoursRaw).toBe("Mon - Fri: 10am - 9pm; Sat: 10am - 6pm; Sun: Closed");
  });

  it("handles 'Daily' and wrap-around ranges", () => {
    expect(run(`<li><span class="label">Daily:</span><span class="value"><time datetime="09:00">9am</time> – <time datetime="17:00">5pm</time></span></li>`).hours?.sun).toEqual({ open: "09:00", close: "17:00" });
    const wrap = run(`<li><span class="label">Fri – Mon:</span><span class="value"><time datetime="09:00">9am</time> – <time datetime="17:00">5pm</time></span></li>`).hours!;
    expect(wrap.fri && wrap.sat && wrap.sun && wrap.mon).toBeTruthy();
    expect(wrap.tue).toBeNull();
  });

  it("falls back to 12-hour text when datetime attributes are absent", () => {
    const { hours } = run(`<li><span class="label">Mon – Sun:</span><span class="value">11:30am – 12:00pm</span></li>`);
    expect(hours?.wed).toEqual({ open: "11:30", close: "12:00" });
  });

  it("returns nulls with raw text when nothing is parseable", () => {
    const { hours, hoursRaw } = run(`<li>By appointment only</li>`);
    expect(hours).toBeNull();
    expect(hoursRaw).toBe("By appointment only");
  });
});
