# field-agent

An engagement agent that walks the mall for you. It scrapes the promotions a shopping-center portal is running, enriches each one with the brand's hours, website, and social links, re-verifies what it stored against the live site, and serves it all through a typed API and a UI built for the people who act on it.

> Take-home for Engagement Agents: **Promotions Aggregator (Single-Mall MVP)**. Target portal: [The Promenade Shops at Briargate](https://www.thepromenadeshopsatbriargate.com/sales/).
> Read [DESIGN.md](./DESIGN.md) for the decisions and [ASSUMPTIONS.md](./ASSUMPTIONS.md) for how the brief was interpreted and what the live runs taught.

## What you get

| Piece | Where | What it does |
|---|---|---|
| `apps/api` | Fastify 5 | Typed REST API. Every response is serialized against the shared Zod schemas. Enqueues jobs; never scrapes inline. |
| `apps/worker` | BullMQ | Scrape and verification jobs. Retries, backoff, per-job timeout, heartbeat, honest counts. |
| `apps/web` | Next.js 16 | Promotions (flat and grouped by brand), brands, run health, verification reports. |
| `packages/shared` | Zod | The one source of truth: scraper output → job payloads → API contract → UI props. |
| `packages/scraper` | got-scraping + cheerio | Portal adapter, politeness throttle, parsers, and the verification diff. Tested against captured real pages. |
| `packages/db` | Drizzle + Postgres | Schema, migrations, repositories. |
| `packages/queue` | BullMQ | Queue factories and job defaults. |

## Prerequisites

- Docker 24+ with Compose v2. That is all you need to run it.
- For development without Docker: Node 22 and pnpm 10 (`corepack enable`).

## Quick start

```bash
git clone https://github.com/Alabs02/field-agent.git
cd field-agent
docker compose up --build
```

No `.env` is needed; every setting has a default. The stack comes up in this order: Postgres and Redis → `migrate` (applies migrations, seeds the portal row and demo users) → `api` → `worker` → `web`.

| Service | URL |
|---|---|
| Web UI | http://localhost:3000/app |
| API docs (OpenAPI) | http://localhost:4000/docs |
| API health | http://localhost:4000/health |
| Queue dashboard (Bull Board) | http://localhost:4000/admin/queues |

On first boot, with no completed scrape in the database, the API enqueues one scrape automatically (`SCRAPE_ON_BOOT=true`). Real promotions appear in the UI about two minutes later. Restarts never re-scrape on their own.

## Trigger a scrape

```bash
curl -s -X POST http://localhost:4000/scrape
```

```json
{ "jobId": "2be2efee-…", "runId": "2be2efee-…", "reused": false, "statusUrl": "/scrape/2be2efee-…" }
```

The request returns in well under a second with `202 Accepted`. Calling it again while that run is active returns the same job with `reused: true` and `200`. Pass `{"force": true}` to re-fetch every page even when the sitemap says nothing changed.

## Follow the job

```bash
curl -s http://localhost:4000/scrape/<jobId>
```

The response carries the phase (`discover → listing → details → brands → finalize`), progress, the five counts the brief asks for, brand counts, the number of requests made against the portal, and every error with its stage, code, and URL.

```json
{
  "status": "completed",
  "effectiveStatus": "completed",
  "queueState": "completed",
  "phase": "done",
  "progress": 100,
  "counts": { "attempted": 30, "persisted": 24, "updated": 1, "skipped": 0, "failed": 5 },
  "brandCounts": { "attempted": 17, "failed": 0 },
  "requestsMade": 51,
  "errors": [{ "stage": "detail", "code": "fetch_timeout", "url": "https://…/deals/3444167/", "sourceId": "3444167", "…": "…" }]
}
```

Invariant: `attempted = persisted + updated + skipped + failed`. `skipped` means "seen and unchanged", never "ignored". A second run typically reports `skipped ≈ 29` and about 20 requests, because unchanged pages are detected from the sitemap and skipped.

`effectiveStatus` reconciles the database row with the queue: a run that says `running` while its heartbeat is stale and no worker holds the job is reported as `stalled`.

## Run a verification

```bash
curl -s -X POST http://localhost:4000/verify
curl -s http://localhost:4000/verify/<runId>
```

The report names every promotion it checked and, for each discrepancy, the field with its before and after value:

```json
{
  "result": "discrepancies",
  "clean": false,
  "summary": { "checked": 30, "clean": 29, "changed": 1, "missingAtSource": 0, "unverifiable": 0, "requestsMade": 13, "sampleRate": 0.2 },
  "findings": [
    {
      "kind": "changed",
      "promotion": { "title": "50% Off Select Beauty", "brandName": "Sephora", "…": "…" },
      "fieldChanges": [{ "field": "imageUrl", "before": "https://cdn-files.eu.placewise.com/…", "after": "https://placewise.imgix.net/…GettyImages…" }],
      "evidence": { "checkedVia": "detail", "detailStatus": 200, "inListing": true, "inSitemap": false }
    }
  ]
}
```

A run with nothing persisted returns `result: "nothing_to_verify"`, never `clean`. Clean findings are stored too, so the report proves what was checked. Verification costs a handful of requests (sitemap, listing, and only the flagged or sampled detail pages), not a full re-scrape.

To see the report catch drift on demand, edit a stored row and verify again:

```bash
docker compose exec api node dist/cli.js drift      # edits a few persisted promotions locally
curl -s -X POST http://localhost:4000/verify
```

## View the UI

- **/** — a marketing lander proposed for Engagement Agents' own site (beyond the brief). The product lives under **/app**.

- **/app** — promotion cards (name, brand, image, end date, link to the portal, verification badge), search across title and brand, brand / collection / date-range / verification filters, sort, page-number pagination, and the **By brand** toggle, which groups the current page under each brand's header (hours, website, phone, suite, socials).
- **/app/promotions/:id** — full description, dates and their provenance, brand panel, verification history.
- **/app/brands** and **/app/brands/:slug** — every brand with promotion counts and the metadata the portal exposes.
- **/app/runs** and **/app/runs/:id** — run health: status, phase timeline, counts, requests, errors; live while a job runs.
- **/app/verify** and **/app/verify/:runId** — verification reports with before/after diffs.

Empty states are honest: this portal lists no per-brand social accounts, so the UI says "Socials not listed on portal" rather than inventing icons.

## API surface

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | `{status, checks:{db,redis}, version, uptimeSec, authRequired}` |
| GET | `/promotions` | `search, startDate, endDate, brand, page, pageSize` plus `sort, collection, category, verification, includeRemoved` |
| GET | `/promotions/:id` | full record with the full brand |
| GET | `/promotions/:id/findings` | verification history for one promotion |
| GET | `/brands` | `{ …brand, promotionCount }`, `hasPromotions`, `search`, `sort` |
| GET | `/brands/:ref` | by id, slug, or name, with its promotions |
| POST | `/scrape` | 202 with a job id; 200 `reused` if one is active; body `{force?, fetchDetails?, fetchBrands?, maxItems?}` |
| GET | `/scrape/:jobId` | state, phase, counts, errors, `effectiveStatus` |
| POST | `/verify` | 202; body `{sampleRate?, promotionIds?}` |
| GET | `/verify/:runId` | discrepancy report |
| GET | `/runs`, `/runs/:id` | scrape and verification runs, newest first |
| GET | `/docs` | OpenAPI UI generated from the same Zod schemas |
| GET | `/admin/queues` | Bull Board |

Errors always use one envelope: `{ error: { code, message, details? }, requestId }`.

## Environment variables

All of them are documented inline in [.env.example](./.env.example). The ones worth knowing:

| Variable | Default | Meaning |
|---|---|---|
| `SCRAPE_MIN_DELAY_MS` | `2000` | Minimum spacing between requests to the portal, shared by scrape and verify. |
| `SCRAPE_RESPECT_CRAWL_DELAY` | `false` | When `true`, the portal's `Crawl-delay: 60` is a floor. Set it in production. |
| `SCRAPE_ENGINE` | `http` | `playwright` with `docker compose --profile browser up`. |
| `SCRAPE_JOB_TIMEOUT_MS` | `5400000` | Per-attempt timeout; aborts in-flight requests, not just the promise. |
| `VERIFY_SAMPLE_RATE` | `0.2` | Share of unflagged promotions whose detail page is re-fetched anyway. |
| `SCRAPE_ON_BOOT` | `true` | Enqueue one scrape on first boot if none has ever completed. |
| `AUTH_REQUIRED` | `false` | The brief wants the local API open. `true` gates mutations and the UI behind sign-in. |
| `SNAPSHOT_MODE` | `changed` | Store raw HTML on first sight and whenever it changes. |

## Demo accounts

Only enforced when `AUTH_REQUIRED=true` (the deployed demo). Password for all: `FieldAgent-Demo-2026!` (override with `SEED_DEMO_PASSWORD`).

| Email | Role | Can |
|---|---|---|
| `super.admin@fieldagent.demo` | super_admin | everything, including the queue dashboard and user admin |
| `operations@fieldagent.demo` | operations | read, trigger scrapes and verifications |
| `data.engineer@fieldagent.demo` | data_engineer | read, trigger scrapes and verifications |
| `account.manager@fieldagent.demo` | account_manager | read |
| `reviewer@fieldagent.demo` | reviewer | read |

## Deploying

See [railway/README.md](./railway/README.md): three services from this repo, Railway's Redis plugin, and a Neon Postgres. The per-service Dockerfiles there are generated from the root `Dockerfile`.

## Local development without Docker

```bash
pnpm install
docker compose up -d postgres redis          # only the datastores
cp .env.example .env
pnpm db:migrate && pnpm db:seed
pnpm dev                                     # api :4000, worker, web :3000
```

## Tests

```bash
pnpm test          # vitest across packages (parsers against captured real pages, diff, throttle, contracts)
pnpm typecheck
pnpm lint
```

The scraper tests run against HTML captured from the portal (`packages/scraper/test/fixtures`), so a structure change on the site shows up as a failing test with a diffable fixture.

## Politeness

One request at a time per host, spaced by `SCRAPE_MIN_DELAY_MS` through a Redis lock shared by every worker and by both job types; `robots.txt` Disallow honored; an honest User-Agent with a contact address; the sitemap read first so unchanged pages are skipped; conditional requests when the server supports them; retailer and affiliate links stored but never followed. Each run records the number of requests it made.

## Known limitations

- Verification diffs promotion fields only; brand fields are refreshed by scrape, not diffed.
- Page-number pagination; cursor pagination is the multi-portal answer.
- The portal itself is not deterministic: one deal intermittently serves a stock placeholder image, and the report says so when it happens (ASSUMPTIONS.md, item 20). A two-observation confirmation rule is the next step.
- No Playwright UI tests; the compose smoke test in CI covers the boot path.
- One portal, hard-coded by design.

## Hours spent

_To be filled in at submission._

## License

MIT
