<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/brand/ea-logo-dark.png">
    <img src="docs/brand/ea-logo-light.png" alt="Engagement Agents" width="240">
  </picture>
</p>

<h1 align="center">Assumptions</h1>

<p align="center"><code>field-agent</code> · Promotions Aggregator (Single-Mall MVP) · prepared for Engagement Agents by Alabura</p>

> Items 1–14 were written from recon on 2026-09-14, before any code. Items 15–23 were appended during the build on 2026-09-14 and 2026-09-15 from live runs. Regrouped by theme on 2026-09-15; the numbering and wording are the originals.

Interpretations of the brief where it was ambiguous, plus things discovered while looking at the source. Dated entries are appended as the build goes.

## Index

| # | When | Theme | One line |
|---|---|---|---|
| [1](#1-crawl-delay) | Recon | Politeness | Production honors `Crawl-delay: 60`; the local default is 2 s |
| [2](#2-sitemap-vs-listing) | Recon | Portal facts | The sitemap lists 31 deals, the listing 29; the listing is the truth |
| [3](#3-collections) | Recon | Portal facts | Deals, Style Notes, and New Arrivals are all ingested, with a `collection` field |
| [4](#4-social-links) | Recon | Portal facts | No store page exposes per-brand social links |
| [5](#5-retailer-websites) | Recon | Portal facts | Retailer websites can be affiliate redirects; stored, flagged, never followed |
| [6](#6-timezone) | Recon | Data semantics | All day math is in `America/Denver` |
| [7](#7-dates) | Recon | Portal facts | JSON-LD dates are authoritative; listing serials are the fallback |
| [8](#8-brand-directory-page) | Recon | Portal facts | "Brand directory page" means `/stores/{id}-{slug}/` |
| [9](#9-removal-semantics) | Recon | Data semantics | Missing from the listing means `removedAt`, never deleted |
| [10](#10-duplicate-promotions) | Recon | Data semantics | A re-post under a new id is relinked by brand, title, and end date |
| [11](#11-hours-format) | Recon | Portal facts | Hours are day ranges with `<time datetime>`; expanded per day |
| [12](#12-verification-scope) | Recon | Data semantics | Only promotion fields are verified |
| [13](#13-auth) | Recon | Auth and deploy | Auth is an extra behind `AUTH_REQUIRED`; the local API stays open |
| [14](#14-polite-also-means-no-off-portal-requests) | Recon | Politeness | Off-portal links are stored, never fetched |
| [15](#15-listing-count-moves-within-the-day) | Live run | Portal behaviour | The listing count moves within the day |
| [16](#16-http2-stalls) | Live run | Portal behaviour | The portal stalls reused HTTP/2 streams; HTTP/1.1 is forced |
| [17](#17-simultaneous-duplicates) | Live run | Portal behaviour | Two live ids for one promotion stay separate rows |
| [18](#18-social-links-measured) | Live run | Portal behaviour | 0 of 17 brands list any social account |
| [19](#19-more-affiliate-networks) | Live run | Portal behaviour | Impact, FlexLinks, and ShopStyle join CJ on the affiliate list |
| [20](#20-the-source-itself-flaps) | Live run | Portal behaviour | One deal intermittently serves a stock image |
| [21](#21-better-auths-base-url-is-the-apis-own-origin) | Live run | Build and deploy | Better Auth's base URL must be the API origin |
| [22](#22-turbo-prune-drops-root-config-files) | Live run | Build and deploy | `turbo prune` drops root config files; CI caught it |
| [23](#23-the-worker-image-never-booted-a-leftover-dev-process-hid-it) | Live run | Build and deploy | The worker image never booted; a leftover dev process hid it |

## Portal facts

*Recorded 2026-09-14 during recon, before code.*

### 2. Sitemap vs listing

**`sitemap.xml` lists 31 deals; the listing shows 29.**

The extra two are expired but still indexed. The listing is the source of truth for "currently promoted"; the sitemap is a change-detection hint.

### 3. Collections

**The `/sales/` page holds three collections in the DOM (Deals, Style Notes, New Arrivals) and filters client-side.**

All three are ingested as promotions with a `collection` field, because all three are retailer campaigns a competitor would care about.

### 4. Social links

**No store page on the portal exposes per-brand social links (checked 10 brands across categories); only the mall's own accounts appear in the footer.**

`socialLinks` is therefore `[]` and the UI says "Not listed on portal". The first full scrape reports the count so this stays verified rather than assumed.

### 5. Retailer websites

**Retailer websites are sometimes affiliate redirects (for example Chico's → `tkqlhce.com`).**

They are stored as given and flagged `websiteIsRedirect`; they are never followed, since that would be an off-portal request.

### 7. Dates

**Listing rows carry `data-start`/`data-end` as Excel-style day serials; deal pages carry JSON-LD `startDate`/`endDate`.**

JSON-LD is authoritative; serials are the fallback and are recorded as such in `dateSource`.

### 8. "Brand directory page"

**"Brand directory page" in the brief maps to `/stores/{id}-{slug}/`.**

The `/directory/` page only lists cards; it is used for categories and brand stubs.

### 11. Hours format

**Store pages express hours as day ranges (`Mon – Sat`, `Sun`) with `<time datetime>` values; ranges are expanded per day.**

Unparseable blocks keep the raw text and `hours: null`.

## Politeness

*Recorded 2026-09-14 during recon, before code.*

### 1. Crawl-delay

**`robots.txt` asks `Crawl-delay: 60`. Production honors it (`SCRAPE_RESPECT_CRAWL_DELAY=true`), making a full run ~50 minutes.**

The local default is `SCRAPE_MIN_DELAY_MS=2000` so a reviewer sees data in ~2 minutes. This is deliberate and reversible by env; the scraper still sends one request at a time, identifies itself, and honors `Disallow`.

### 14. "Polite" also means no off-portal requests

**Retailer websites and affiliate links are stored, never fetched.**

## Data semantics

*Recorded 2026-09-14 during recon, before code.*

### 6. Timezone

**The mall is in Colorado Springs; JSON-LD dates carry `-0600`.**

All day-granularity filtering and diffing uses `America/Denver`.

### 9. Removal semantics

**A promotion missing from the listing is marked `removedAt`, never deleted, so verification and history remain intact.**

### 10. Duplicate promotions

**The same promotion re-posted under a new id is detected by brand + normalized title + end date and relinked to the existing row.**

### 12. Verification scope

**Only promotion fields are verified; brand fields (hours, website) are refreshed by scrape, not diffed by verify.**

Cut for time, noted in DESIGN.md.

## Auth and deploy

*Recorded 2026-09-14 during recon, before code. See also 21–23 below, discovered while deploying.*

### 13. Auth

**The brief lists auth as a non-goal and requires the local API to be open.**

Auth is added as an extra behind `AUTH_REQUIRED` (default `false` locally, `true` on the deployed demo), so the local requirement still holds.

## Learned from live runs

*Recorded 2026-09-14 and 2026-09-15 during the build, from real scrapes, verifications, and deploys.*

### Portal behaviour

#### 15. Listing count moves within the day

**Recon at 07:30 Denver saw 29 promotions; the first scrape at 08:56 saw 30.**

The sitemap captured at 09:33 omitted a deal (3444509) that the listing and the deal page still served. The listing is the source of truth; the sitemap is a change-detection hint only.

#### 16. HTTP/2 stalls

**5 of 30 detail fetches timed out at 20 s on the first run while curl answered the same URLs in ~3 s.**

The portal stalls reused HTTP/2 streams; the engine forces HTTP/1.1 and retries a transient failure once, waiting its throttle turn. The second run had zero failures.

#### 17. Simultaneous duplicates

**"The Metal Edit" was listed twice under two ids at the same time.**

Fingerprint relinking is reserved for re-posts over time (the earlier id has already left the listing); duplicates that are live together stay as separate rows, because merging them would flip-flop every run.

#### 18. Social links, measured

**After the first full run: 17 of 17 brands with promotions had their store page fetched, 17 of 17 list hours and a website, 0 of 17 list any social account.**

`socialLinks: []` is the true state of this portal, not a parser gap.

#### 19. More affiliate networks

**Beyond CJ (`tkqlhce.com`), the portal links retailers through Impact (`*.fjbu.net`), FlexLinks (`track.flexlinkspro.com`) and ShopStyle (`shopstyle.it`).**

All are flagged `websiteIsRedirect` and never followed.

#### 20. The source itself flaps

**Verification flagged one promotion (Sephora, "50% Off Select Beauty") whose JSON-LD image switched from the deal's own CDN image to a generic Getty stock image on imgix.**

Five cookie-less requests in a row returned the real image four times and the stock image once, so the portal intermittently serves a placeholder for this deal. The report says what the source served at that moment; the promotion's verification history shows the flapping. A confirmation rule (two consecutive observations before reporting image drift) is the obvious next step and is listed under "what I'd revisit".

### Build and deploy

#### 21. Better Auth's base URL is the API's own origin

**It derives its base path from that URL, so pointing it at the web origin's `/backend` proxy path made every auth route 404.**

The web app still reaches auth only through `/backend/api/auth`, so cookies stay first-party.

#### 22. turbo prune drops root config files

**The web build inside Docker failed on a clean CI runner because `apps/web/tsconfig.json` extends `tsconfig.base.json`, which `turbo prune --docker` does not copy.**

The Dockerfile copies it explicitly. Found by CI, not locally: the local Docker Desktop VM (2 GB RAM, host disk that filled up mid-build) was not a trustworthy clean machine.

#### 23. The worker image never booted; a leftover dev process hid it

**Both bundled apps are built by tsup as ESM. The scraper's `got-scraping` depends on `http2-wrapper`, a CommonJS module that calls `require("http2")` at load, and esbuild's ESM shim throws `Dynamic require of "http2" is not supported` for that.**

The compose worker crash-looped from its first build, but a `tsx` dev worker left running on the host from earlier in the day was connected to the same Redis and processed every job, so the local acceptance looked green. Railway, with nothing else attached to its Redis, showed the crash immediately. Fix: a `createRequire` banner in both tsup configs. Hardening: the worker now writes a readiness file when both queues are ready, the image has a health check on it, and CI asserts the worker is healthy, so a crash-looping worker fails `docker compose up --wait` instead of passing it.

---

*Engagement Agents and the Engagement Agents logo belong to Engagement Agents and appear here only to identify the company this take-home was prepared for. This repository is the independent work of Alabura ([Alabs02](https://github.com/Alabs02)) and is not affiliated with or endorsed by Engagement Agents.*
