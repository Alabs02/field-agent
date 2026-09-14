import { UnrecoverableError, type Job } from "bullmq";
import { brandsRepo, promotionsRepo, runsRepo, type BrandRow } from "@field-agent/db";
import {
  ScrapeJobPayloadSchema,
  type ScrapeCounts,
  type ScrapeJobPayload,
  type ScrapePhase,
  type ScrapedBrand,
  type ScrapedListingRow,
  type ScrapedPromotion,
} from "@field-agent/shared";
import {
  AbortedError,
  dayInZone,
  effectiveDelayMs,
  excelSerialToEndOfDay,
  excelSerialToStartOfDay,
  hashFields,
  isScrapeError,
  JobTimeoutError,
  promotionFingerprint,
  type AdapterContext,
  type Discovery,
} from "@field-agent/scraper";
import type { WorkerContext } from "../lib/context.js";
import { makeFetcher } from "../lib/fetcher.js";
import { RunTracker } from "../lib/runTracker.js";
import { withTimeout } from "../lib/withTimeout.js";

interface ScrapeState {
  status: "running" | "completed" | "completed_with_errors" | "failed";
  phase: ScrapePhase;
  progress: number;
  attempted: number;
  persisted: number;
  updated: number;
  skipped: number;
  failed: number;
  brandsAttempted: number;
  brandsFailed: number;
}

const PHASE_WEIGHTS: Record<ScrapePhase, [start: number, size: number]> = {
  queued: [0, 0],
  discover: [0, 5],
  listing: [5, 10],
  details: [15, 60],
  brands: [75, 20],
  finalize: [95, 5],
  done: [100, 0],
};

const pct = (phase: ScrapePhase, fraction: number) => {
  const [start, size] = PHASE_WEIGHTS[phase];
  return Math.min(100, Math.round(start + size * Math.max(0, Math.min(1, fraction))));
};

export async function processScrapeJob(ctx: WorkerContext, job: Job<ScrapeJobPayload>): Promise<ScrapeCounts> {
  const payload = ScrapeJobPayloadSchema.parse(job.data);
  const { db, env } = ctx;
  const log = ctx.log.child({ runId: payload.runId, jobId: job.id, attempt: job.attemptsMade + 1, queue: "scrape" });
  const runRow = await runsRepo.getScrapeRun(db, payload.runId);
  if (!runRow) throw new UnrecoverableError(`scrape run ${payload.runId} not found`);

  const tracker = new RunTracker<ScrapeState>(
    {
      status: "running",
      phase: "discover",
      progress: 0,
      attempted: 0,
      persisted: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      brandsAttempted: 0,
      brandsFailed: 0,
    },
    (patch) => runsRepo.updateScrapeRun(db, payload.runId, patch),
    job,
    (s) => ({ phase: s.phase, pct: s.progress, counts: counts(s) }),
  );

  await runsRepo.updateScrapeRun(db, payload.runId, {
    status: "running",
    phase: "discover",
    progress: 0,
    attemptsMade: job.attemptsMade + 1,
    startedAt: runRow.startedAt ?? new Date(),
    heartbeatAt: new Date(),
    error: null,
    // A retry starts the counts over; the errors list is kept so the first attempt's story survives.
    attempted: 0,
    persisted: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    brandsAttempted: 0,
    brandsFailed: 0,
    requestsMade: 0,
  });
  tracker.start();
  log.info({ options: payload.options }, "scrape started");

  try {
    const result = await withTimeout(env.SCRAPE_JOB_TIMEOUT_MS, (signal) => runScrape(ctx, payload, tracker, signal, log));
    tracker.stop();
    const finalStatus = result.failed === 0 && tracker.state.brandsFailed === 0 ? "completed" : "completed_with_errors";
    tracker.update((s) => {
      s.status = finalStatus;
      s.phase = "done";
      s.progress = 100;
    });
    await tracker.flush(true);
    await runsRepo.updateScrapeRun(db, payload.runId, { status: finalStatus, finishedAt: new Date() });
    log.info({ counts: result, brands: { attempted: tracker.state.brandsAttempted, failed: tracker.state.brandsFailed }, requests: tracker.requestsMade }, "scrape finished");
    return result;
  } catch (err) {
    tracker.stop();
    const timedOut = err instanceof JobTimeoutError || (err instanceof AbortedError && err.cause instanceof JobTimeoutError);
    const retryable = !timedOut && isScrapeError(err) && err.retryable && job.attemptsMade + 1 < (job.opts.attempts ?? 1);
    tracker.recordError("run", err);
    tracker.update((s) => {
      s.status = "failed";
    });
    await tracker.flush(true);
    await runsRepo.updateScrapeRun(db, payload.runId, {
      status: retryable ? "queued" : "failed",
      error: err instanceof Error ? err.message : String(err),
      finishedAt: retryable ? null : new Date(),
    });
    log.error({ err, retryable, timedOut }, "scrape failed");
    if (retryable) throw err; // BullMQ retries with backoff, same runId
    throw new UnrecoverableError(err instanceof Error ? err.message : String(err));
  }
}

function counts(s: ScrapeState): ScrapeCounts {
  return { attempted: s.attempted, persisted: s.persisted, updated: s.updated, skipped: s.skipped, failed: s.failed };
}

async function runScrape(
  ctx: WorkerContext,
  payload: ScrapeJobPayload,
  tracker: RunTracker<ScrapeState>,
  signal: AbortSignal,
  log: WorkerContext["log"],
): Promise<ScrapeCounts> {
  const { db, env, adapter } = ctx;
  const now = () => new Date();
  const portalId = payload.portalId;
  const tz = adapter.timezone;

  // --- discover: robots + sitemap ---------------------------------------
  let discovery: Discovery | null = null;
  let throttle = ctx.makeThrottle(env.SCRAPE_MIN_DELAY_MS);
  const fetcher = makeFetcher({
    db,
    engine: ctx.engine,
    get throttle() {
      return throttle;
    },
    log,
    portalId,
    runId: payload.runId,
    snapshotMode: env.SNAPSHOT_MODE,
    signal,
    isAllowed: () => (discovery ? discovery.isAllowed : () => true),
    onRequest: () => tracker.countRequest(),
  });
  const actx: AdapterContext = { fetch: fetcher, log, signal, now };

  tracker.update((s) => {
    s.phase = "discover";
    s.progress = pct("discover", 0);
  });
  discovery = await adapter.discover(actx);
  const delay = effectiveDelayMs(env.SCRAPE_MIN_DELAY_MS, discovery.crawlDelayMs, env.SCRAPE_RESPECT_CRAWL_DELAY);
  if (delay !== env.SCRAPE_MIN_DELAY_MS) throttle = ctx.makeThrottle(delay);
  log.info({ crawlDelayMs: discovery.crawlDelayMs, effectiveDelayMs: delay, sitemapUrls: discovery.sitemap.size }, "discovered");

  // --- listing + directory ------------------------------------------------
  tracker.update((s) => {
    s.phase = "listing";
    s.progress = pct("listing", 0);
  });
  let rows = await adapter.fetchListing(actx);
  if (payload.options.maxItems) rows = rows.slice(0, payload.options.maxItems);
  log.info({ rows: rows.length }, "listing parsed");

  const brandById = new Map<string, BrandRow>();
  try {
    const stubs = await adapter.fetchDirectory(actx);
    for (const stub of stubs) {
      const row = await brandsRepo.ensureBrandStub(db, portalId, stub, adapter.baseUrl);
      brandById.set(row.sourceId, row);
    }
    log.info({ brands: stubs.length }, "directory parsed");
  } catch (err) {
    if (err instanceof AbortedError) throw err;
    tracker.recordError("directory", err);
    log.warn({ err }, "directory unavailable; brands will be stubbed from the listing");
  }
  for (const row of rows) {
    if (!brandById.has(row.brandSourceId)) {
      const b = await brandsRepo.ensureBrandStub(db, portalId, { sourceId: row.brandSourceId, name: row.brandName }, adapter.baseUrl);
      brandById.set(b.sourceId, b);
    }
  }
  const removed = await promotionsRepo.markRemovedExcept(db, portalId, rows.map((r) => r.sourceId), now());
  if (removed) log.info({ removed }, "promotions no longer on the listing were marked removed");
  tracker.update((s) => {
    s.progress = pct("listing", 1);
  });

  // --- details ---------------------------------------------------------------
  tracker.update((s) => {
    s.phase = "details";
  });
  const storeUrlByBrand = new Map<string, string>();
  const fallbackByBrand = new Map<string, ScrapedBrand>();

  for (const [i, row] of rows.entries()) {
    if (signal.aborted) throw new AbortedError(signal.reason);
    tracker.update((s) => {
      s.attempted += 1;
      s.progress = pct("details", i / rows.length);
    });
    const brand = brandById.get(row.brandSourceId)!;
    const existing = await promotionsRepo.findPromotionBySourceId(db, portalId, row.sourceId);
    const listingHash = listingRowHash(row);

    // Skip when nothing could have changed: sitemap lastmod not newer than our
    // last detail fetch and the listing row hashes the same as before.
    const entry = discovery.sitemap.get(adapter.canonicalize(row.detailUrl));
    const canSkip =
      !payload.options.force &&
      existing?.detailFetchedAt != null &&
      entry?.lastmod != null &&
      entry.lastmod <= existing.detailFetchedAt &&
      (existing.sourcePayload as { listingHash?: string } | null)?.listingHash === listingHash;

    if (canSkip || !payload.options.fetchDetails) {
      try {
        const { outcome } = await persistFromListing(db, portalId, brand, row, existing?.detailFetchedAt ?? null, payload.runId, now(), tz, listingHash, existing?.sourcePayload ?? null);
        tracker.update((s) => {
          s[outcome] += 1;
        });
      } catch (err) {
        if (err instanceof AbortedError) throw err;
        tracker.recordError("persist", err, { sourceId: row.sourceId, url: row.detailUrl });
        tracker.update((s) => {
          s.failed += 1;
        });
      }
      continue;
    }

    try {
      const fetched = await adapter.fetchPromotion(actx, row);
      if (fetched.promotion.brandStoreUrl) storeUrlByBrand.set(row.brandSourceId, fetched.promotion.brandStoreUrl);
      if (fetched.brandFallback) fallbackByBrand.set(row.brandSourceId, fetched.brandFallback);
      const { outcome } = await persistFromDetail(db, portalId, brand, fetched.promotion, payload.runId, now(), tz, listingHash);
      tracker.update((s) => {
        s[outcome] += 1;
      });
    } catch (err) {
      if (err instanceof AbortedError) throw err;
      tracker.recordError("detail", err, { sourceId: row.sourceId, url: row.detailUrl });
      log.warn({ err, sourceId: row.sourceId }, "detail fetch failed; persisting listing-level data");
      try {
        await persistFromListing(db, portalId, brand, row, existing?.detailFetchedAt ?? null, payload.runId, now(), tz, listingHash, existing?.sourcePayload ?? null);
      } catch (persistErr) {
        tracker.recordError("persist", persistErr, { sourceId: row.sourceId, url: row.detailUrl });
      }
      tracker.update((s) => {
        s.failed += 1;
      });
    }
  }
  tracker.update((s) => {
    s.progress = pct("details", 1);
  });

  // --- brands ----------------------------------------------------------------
  tracker.update((s) => {
    s.phase = "brands";
  });
  if (payload.options.fetchBrands) {
    const staleBefore = new Date(Date.now() - env.BRAND_REFRESH_HOURS * 3_600_000);
    const targets = payload.options.force
      ? [...new Set(rows.map((r) => r.brandSourceId))].map((id) => brandById.get(id)!)
      : await brandsRepo.brandsNeedingRefresh(db, portalId, staleBefore);
    log.info({ brands: targets.length }, "brands to refresh");
    for (const [i, brand] of targets.entries()) {
      if (signal.aborted) throw new AbortedError(signal.reason);
      tracker.update((s) => {
        s.brandsAttempted += 1;
        s.progress = pct("brands", i / Math.max(1, targets.length));
      });
      const storeUrl = storeUrlByBrand.get(brand.sourceId) ?? brand.sourceUrl;
      try {
        const scraped = await adapter.fetchBrand(actx, storeUrl);
        await brandsRepo.upsertBrandDetails(db, portalId, scraped, brandHash(scraped), now());
      } catch (err) {
        if (err instanceof AbortedError) throw err;
        tracker.recordError("brand", err, { sourceId: brand.sourceId, url: storeUrl });
        tracker.update((s) => {
          s.brandsFailed += 1;
        });
        const fallback = fallbackByBrand.get(brand.sourceId);
        if (fallback) {
          // Data seen on the deal page is a real observation; keep it but leave storePageFetchedAt as-is.
          await brandsRepo.upsertBrandDetails(db, portalId, fallback, brandHash(fallback), now()).catch(() => {});
          log.warn({ sourceId: brand.sourceId }, "store page failed; used the deal page's embedded store block");
        }
      }
    }
  }

  // --- finalize --------------------------------------------------------------
  tracker.update((s) => {
    s.phase = "finalize";
    s.progress = pct("finalize", 0);
  });
  const socials = await brandsRepo.countBrandsWithStoreData(db, portalId);
  log.info(socials, "brand store pages fetched / with social links");
  return counts(tracker.state);
}

function listingRowHash(row: ScrapedListingRow): string {
  return hashFields({
    title: row.title,
    brand: row.brandSourceId,
    image: row.imageUrl,
    collection: row.collection,
    start: row.startSerial == null ? null : Math.floor(row.startSerial),
    end: row.endSerial == null ? null : Math.floor(row.endSerial),
  });
}

function brandHash(b: ScrapedBrand): string {
  return hashFields({
    name: b.name,
    website: b.websiteUrl,
    hours: b.hours,
    hoursRaw: b.hoursRaw,
    phone: b.phone,
    location: b.location,
    description: b.description,
    logo: b.logoUrl,
    socials: b.socialLinks,
  });
}

function contentHashOf(p: { title: string; description: string | null; imageUrl: string | null; startsOn: string | null; endsOn: string | null; brand: string; collection: string }): string {
  return hashFields(p);
}

async function persistFromDetail(
  db: WorkerContext["db"],
  portalId: string,
  brand: BrandRow,
  p: ScrapedPromotion,
  runId: string,
  now: Date,
  tz: string,
  listingHash: string,
) {
  const hasJsonLdDates = p.startsAt != null || p.endsAt != null;
  const startsAt = p.startsAt ? new Date(p.startsAt) : p.startSerial != null ? excelSerialToStartOfDay(p.startSerial, tz) : null;
  const endsAt = p.endsAt ? new Date(p.endsAt) : p.endSerial != null ? excelSerialToEndOfDay(p.endSerial, tz) : null;
  const dateSource = hasJsonLdDates ? "jsonld" : startsAt || endsAt ? "listing_serial" : "none";
  const endsOn = dayInZone(endsAt, tz);
  return promotionsRepo.upsertPromotion(db, {
    portalId,
    brandId: brand.id,
    sourceId: p.sourceId,
    fingerprint: promotionFingerprint(p.title, p.brandSourceId, endsOn),
    collection: p.collection,
    title: p.title,
    description: p.description,
    descriptionHtml: p.descriptionHtml,
    imageUrl: p.imageUrl,
    startsAt,
    endsAt,
    dateSource,
    canonicalUrl: p.canonicalUrl,
    sourcePayload: { jsonLd: p.jsonLd, listing: { startSerial: p.startSerial, endSerial: p.endSerial, endsText: p.endsText }, listingHash },
    contentHash: contentHashOf({
      title: p.title,
      description: p.description,
      imageUrl: p.imageUrl,
      startsOn: dayInZone(startsAt, tz),
      endsOn,
      brand: p.brandSourceId,
      collection: p.collection,
    }),
    detailFetchedAt: now,
    runId,
    now,
  });
}

/** Listing-level write: used for skips (unchanged) and as the fallback when a detail fetch fails. */
async function persistFromListing(
  db: WorkerContext["db"],
  portalId: string,
  brand: BrandRow,
  row: ScrapedListingRow,
  detailFetchedAt: Date | null,
  runId: string,
  now: Date,
  tz: string,
  listingHash: string,
  priorPayload: Record<string, unknown> | null,
) {
  const existing = await promotionsRepo.findPromotionBySourceId(db, portalId, row.sourceId);
  if (existing && existing.detailFetchedAt) {
    // Keep the richer detail-level content; only refresh listing-level provenance.
    return promotionsRepo.upsertPromotion(db, {
      portalId,
      brandId: brand.id,
      sourceId: row.sourceId,
      fingerprint: existing.fingerprint,
      collection: existing.collection,
      title: existing.title,
      description: existing.description,
      descriptionHtml: existing.descriptionHtml,
      imageUrl: existing.imageUrl,
      startsAt: existing.startsAt,
      endsAt: existing.endsAt,
      dateSource: existing.dateSource,
      canonicalUrl: existing.canonicalUrl,
      sourcePayload: { ...(priorPayload ?? {}), listingHash },
      contentHash: existing.contentHash,
      detailFetchedAt,
      runId,
      now,
    });
  }
  const startsAt = row.startSerial != null ? excelSerialToStartOfDay(row.startSerial, tz) : null;
  const endsAt = row.endSerial != null ? excelSerialToEndOfDay(row.endSerial, tz) : null;
  const endsOn = dayInZone(endsAt, tz);
  return promotionsRepo.upsertPromotion(db, {
    portalId,
    brandId: brand.id,
    sourceId: row.sourceId,
    fingerprint: promotionFingerprint(row.title, row.brandSourceId, endsOn),
    collection: row.collection,
    title: row.title,
    description: null,
    descriptionHtml: null,
    imageUrl: row.imageUrl,
    startsAt,
    endsAt,
    dateSource: startsAt || endsAt ? "listing_serial" : "none",
    canonicalUrl: row.detailUrl,
    sourcePayload: { listing: { startSerial: row.startSerial, endSerial: row.endSerial, endsText: row.endsText }, listingHash },
    contentHash: contentHashOf({
      title: row.title,
      description: null,
      imageUrl: row.imageUrl,
      startsOn: dayInZone(startsAt, tz),
      endsOn,
      brand: row.brandSourceId,
      collection: row.collection,
    }),
    detailFetchedAt: null,
    runId,
    now,
  });
}
