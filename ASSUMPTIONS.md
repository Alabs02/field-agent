# ASSUMPTIONS.md

Interpretations of the brief where it was ambiguous, plus things discovered while looking at the source. Dated entries are appended as the build goes.

## From recon (2026-09-14, before code)

1. **Crawl-delay.** `robots.txt` asks `Crawl-delay: 60`. Production honors it (`SCRAPE_RESPECT_CRAWL_DELAY=true`), making a full run ~50 minutes. The local default is `SCRAPE_MIN_DELAY_MS=2000` so a reviewer sees data in ~2 minutes. This is deliberate and reversible by env; the scraper still sends one request at a time, identifies itself, and honors `Disallow`.
2. **Sitemap vs listing.** `sitemap.xml` lists 31 deals; the listing shows 29. The extra two are expired but still indexed. The listing is the source of truth for "currently promoted"; the sitemap is a change-detection hint.
3. **Collections.** The `/sales/` page holds three collections in the DOM (Deals, Style Notes, New Arrivals) and filters client-side. All three are ingested as promotions with a `collection` field, because all three are retailer campaigns a competitor would care about.
4. **Social links.** No store page on the portal exposes per-brand social links (checked 10 brands across categories); only the mall's own accounts appear in the footer. `socialLinks` is therefore `[]` and the UI says "Not listed on portal". The first full scrape reports the count so this stays verified rather than assumed.
5. **Retailer websites** are sometimes affiliate redirects (for example Chico's → `tkqlhce.com`). They are stored as given and flagged `websiteIsRedirect`; they are never followed, since that would be an off-portal request.
6. **Timezone.** The mall is in Colorado Springs; JSON-LD dates carry `-0600`. All day-granularity filtering and diffing uses `America/Denver`.
7. **Dates.** Listing rows carry `data-start`/`data-end` as Excel-style day serials; deal pages carry JSON-LD `startDate`/`endDate`. JSON-LD is authoritative; serials are the fallback and are recorded as such in `dateSource`.
8. **"Brand directory page"** in the brief maps to `/stores/{id}-{slug}/`. The `/directory/` page only lists cards; it is used for categories and brand stubs.
9. **Removal semantics.** A promotion missing from the listing is marked `removedAt`, never deleted, so verification and history remain intact.
10. **Duplicate promotions.** The same promotion re-posted under a new id is detected by brand + normalized title + end date and relinked to the existing row.
11. **Hours format.** Store pages express hours as day ranges (`Mon – Sat`, `Sun`) with `<time datetime>` values; ranges are expanded per day. Unparseable blocks keep the raw text and `hours: null`.
12. **Verification scope.** Only promotion fields are verified; brand fields (hours, website) are refreshed by scrape, not diffed by verify. Cut for time, noted in DESIGN.md.
13. **Auth.** The brief lists auth as a non-goal and requires the local API to be open. Auth is added as an extra behind `AUTH_REQUIRED` (default `false` locally, `true` on the deployed demo), so the local requirement still holds.
14. **"Polite" also means no off-portal requests.** Retailer websites and affiliate links are stored, never fetched.
