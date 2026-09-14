# DESIGN.md

Written before the code, per the brief. Everything below is a decision I expect to defend; "what I'd revisit" is at the end.

## What this is

A single-portal vertical slice of a promotions pipeline: scrape **The Promenade Shops at Briargate** (`/sales/`), enrich each promotion with brand data from the store pages, persist to Postgres, re-verify against the live site, expose a typed REST API, and render a UI that filters, paginates, and groups by brand. Scrape and verify are BullMQ jobs on Redis, never inline.

## Scraping approach

**The portal is a Placewise "mpc" CMS (Lucee) and is fully server-rendered.** Deal pages carry JSON-LD `SaleEvent` (name, description, image, start/end with UTC offset); store pages carry JSON-LD `Store` plus a structured hours block (`<time datetime="10:00">`). So the scraper is **HTTP + cheerio**, parsing JSON-LD first and the DOM second. No headless browser is needed, and bundling one would add ~400 MB to the worker image and a class of failure modes for zero data gain.

**Why naive `fetch()` misbehaves:** two 301 hops (`apex → www`, `/sales → /sales/`) plus session cookies (`cfid`, `cftoken`, `__Host-lb`). The engine canonicalizes every URL to `https://www.…/path/`, follows redirects, and keeps a cookie jar (`got-scraping` + `tough-cookie`). It sends an honest, stable User-Agent with a contact email rather than a spoofed browser fingerprint.

A `ScrapeEngine` interface isolates the transport; a Playwright engine ships behind the Docker profile `browser` as the documented escape hatch for JS-rendered portals.

**Multi-page stitch:** listing (`/sales/`) → each deal page (`/deals/{id}/`) → each brand's store page (`/stores/{storeId}-{slug}/`, linked from the deal page). Brand pages are fetched once per brand per run, not once per promotion.

**Politeness.** `robots.txt` says `Crawl-delay: 60`. In production the worker honors it (`SCRAPE_RESPECT_CRAWL_DELAY=true`; effective delay = max(configured, robots)); a full run is then ~50 minutes, which is fine for a nightly job. Locally the default is 2 s so a reviewer sees data in ~2 minutes; that is an explicit, reversible env choice recorded in ASSUMPTIONS.md. One request in flight per host, enforced by a Redis token bucket shared by scrape **and** verify (same budget, NFR-2). `Disallow` paths are never fetched. Off-portal links (retailer sites, affiliate redirects) are stored, never followed. The sitemap (`lastmod`, `expires`) is read first so unchanged pages are skipped, and conditional requests are used when the server gives us ETag or Last-Modified.

## Schema choices (Postgres via Drizzle)

- **Brands are normalized** (`promotions.brand_id → brands`). Hours, website, and socials are brand facts, several promotions share a brand, `promotionCount` is a `GROUP BY`, and brand data cannot drift between two promos of the same brand. Denormalizing would mean one store-page fetch per promotion and a multi-row update for every brand edit.
- **Stable identity** = `(portal_id, source_id)` where `source_id` is the Placewise deal id in the URL. A re-post of the same promotion under a new id is caught by a `fingerprint` = sha256(normalized title | brand source id | end date) and relinked in place (old id kept in `previous_source_ids`).
- **Dates** are `timestamptz` from JSON-LD (authoritative, carries `-0600`). Day-granularity filtering and diffing happen in `America/Denver` at query and diff time; no lossy `date` columns. The listing's `data-start`/`data-end` Excel-style serials are a fallback only.
- **Missing data:** unknown scalar → `null`, unknown list → `[]`, never `""`. Provenance timestamps (`detail_fetched_at`, `store_page_fetched_at`) distinguish "the portal has none" from "we haven't looked yet".
- **Hours** are structured JSON (`{mon:{open,close}|null, …}`) with the raw text kept alongside, so the UI can say "open today 10 AM–8 PM" and the diff can compare, while nothing is lost if a format slips past the parser.
- **Social links** are a JSON array of `{platform, url}`; the portal exposes none per brand (verified during recon), so `[]` is the honest common case and the UI says so instead of showing empty icons.
- **Run tables are the durable record.** `scrape_runs.id` is the BullMQ job id; counts, phase, errors, and heartbeat live in Postgres so state survives a Redis flush and the API can answer even when no worker is alive.

## Queue model

Two queues (`scrape`, `verify`), one job each, `concurrency: 1` (politeness serializes requests anyway, so child-job fan-out buys nothing and would split the five counts across rows). Retries: 3 attempts, exponential backoff from 30 s; parse and validation errors are `UnrecoverableError` (retrying a parser bug is noise). BullMQ has no per-job timeout, so one is built from `AbortController` + `Promise.race`; the signal flows into every fetch and throttle sleep, so a timeout aborts real I/O, not just the promise. Stalled jobs (worker SIGKILL) are detected via lock expiry and the run row's stale heartbeat, surfaced as `effectiveStatus: stalled`, and resumed by the next worker with `attemptsMade: 2`. Invariant: `attempted = persisted + updated + skipped + failed`, where `skipped` means "seen and unchanged" (content hash), never "ignored". A listing that returns 200 with zero rows fails the run loudly; "quietly returned nothing" is the failure mode the brief warns about.

## Verification pass

Three stages, cheapest first: (1) `sitemap.xml`, one request, detects removals, expiry, and `lastmod` bumps; (2) the listing, one request, detects presence, title, brand, image identity, and end-date drift; (3) detail pages are re-fetched **only** for promotions flagged by 1–2, plus a deterministic random sample (`VERIFY_SAMPLE_RATE`, default 20 %) to catch silent detail-only edits across successive runs. Listing evidence alone never asserts a change; a fetch failure yields `unverifiable` with the reason. Budget ≈ 2 + flagged + sampled ≈ 8–12 requests for ~30 promotions, versus ~50 for a full re-scrape on the same politeness budget.

**Where the discrepancy line is:** compared fields are title, description, image identity, start and end date (day granularity, Denver), brand, collection, and listed/not-listed. Below the line: whitespace, HTML entities, smart quotes, CDN resize or cache-busting on the same image, and sub-day time shifts. A run with nothing to check returns `nothing_to_verify`, not `clean`; `clean` requires `checked > 0`. Clean findings are stored too, so the report proves what was checked, not just what failed.

## Failure modes I expect

403/429 from the portal (retry with backoff, then `failed` with the status in the run errors) · site structure change (listing-empty guard fails the run; committed HTML fixtures and stored snapshots show the before) · Redis flush mid-run (DB row remains, job re-enqueues from the API) · worker SIGKILL (stall → resume) · partial detail failures (row persisted from listing data, counted `failed`, never dropped) · timezone mistakes (all day math pinned to America/Denver, tested) · affiliate-redirect websites (flagged, not followed).

## Stack deviations from the brief's bonus list

**Fastify instead of Express.** BullMQ needs a long-lived Node process, so edge runtimes are out; on Node, Fastify is the framework built for exactly that: schema validation and response serialization from the same Zod contracts (`fastify-type-provider-zod`), first-party plugins for rate limiting, load shedding, CORS, and swagger, a Bull Board adapter, and materially higher throughput. Express is in maintenance mode with the weakest TypeScript story of the three. Everything else on the bonus list (Next.js frontend, containerized datastore, shared workspace types) is followed as written.

## What I cut for time

Cursor pagination (page-number is right for tens of rows and constantly changing filters; cursor is the multi-portal answer) · brand-field verification (only promotion fields are diffed) · BullMQ flows for multi-portal fan-out · trigram search index (`ILIKE` is fine at this size) · Playwright UI tests · scheduling (a repeatable job is one option away).

## What I'd revisit

The 20 % sample rate is a guess. With real drift data I would replace it with per-promotion staleness (verify oldest-verified first) plus a small always-on canary set, which spends the same budget where drift actually happens.
