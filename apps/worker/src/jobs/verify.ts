import { UnrecoverableError, type Job } from "bullmq";
import { findingsRepo, promotionsRepo, runsRepo, type PromotionWithBrand } from "@field-agent/db";
import {
  VerifyJobPayloadSchema,
  type FieldChange,
  type FieldName,
  type FindingEvidence,
  type ScrapedListingRow,
  type VerificationCounts,
  type VerificationOutcome,
  type VerifyJobPayload,
} from "@field-agent/shared";
import {
  AbortedError,
  dayInZone,
  detailDiff,
  effectiveDelayMs,
  excelSerialToEndOfDay,
  isScrapeError,
  JobTimeoutError,
  listingFlags,
  sha256,
  type AdapterContext,
  type ComparablePromotion,
  type Discovery,
} from "@field-agent/scraper";
import type { WorkerContext } from "../lib/context.js";
import { makeFetcher } from "../lib/fetcher.js";
import { RunTracker } from "../lib/runTracker.js";
import { withTimeout } from "../lib/withTimeout.js";

interface VerifyState {
  status: "running" | "completed" | "completed_with_errors" | "failed";
  checked: number;
  clean: number;
  changed: number;
  missing: number;
  unverifiable: number;
}

export async function processVerifyJob(ctx: WorkerContext, job: Job<VerifyJobPayload>): Promise<VerificationCounts> {
  const payload = VerifyJobPayloadSchema.parse(job.data);
  const { db, env } = ctx;
  const log = ctx.log.child({ runId: payload.runId, jobId: job.id, attempt: job.attemptsMade + 1, queue: "verify" });
  const runRow = await runsRepo.getVerificationRun(db, payload.runId);
  if (!runRow) throw new UnrecoverableError(`verification run ${payload.runId} not found`);

  const tracker = new RunTracker<VerifyState>(
    { status: "running", checked: 0, clean: 0, changed: 0, missing: 0, unverifiable: 0 },
    (patch) => runsRepo.updateVerificationRun(db, payload.runId, patch),
    job,
    (s) => ({ pct: 0, counts: s }),
  );
  await runsRepo.updateVerificationRun(db, payload.runId, {
    status: "running",
    attemptsMade: job.attemptsMade + 1,
    startedAt: runRow.startedAt ?? new Date(),
    heartbeatAt: new Date(),
    error: null,
    checked: 0,
    clean: 0,
    changed: 0,
    missing: 0,
    unverifiable: 0,
    requestsMade: 0,
  });
  tracker.start();
  log.info({ sampleRate: payload.sampleRate, promotionIds: payload.promotionIds?.length ?? null }, "verification started");

  try {
    const result = await withTimeout(env.VERIFY_JOB_TIMEOUT_MS, (signal) => runVerify(ctx, payload, tracker, signal, log));
    tracker.stop();
    const finalStatus = tracker.state.unverifiable === 0 ? "completed" : "completed_with_errors";
    tracker.update((s) => {
      s.status = finalStatus;
    });
    await tracker.flush(true);
    await runsRepo.updateVerificationRun(db, payload.runId, { status: finalStatus, finishedAt: new Date() });
    log.info({ counts: result, requests: tracker.requestsMade }, "verification finished");
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
    await runsRepo.updateVerificationRun(db, payload.runId, {
      status: retryable ? "queued" : "failed",
      error: err instanceof Error ? err.message : String(err),
      finishedAt: retryable ? null : new Date(),
    });
    log.error({ err, retryable, timedOut }, "verification failed");
    if (retryable) throw err;
    throw new UnrecoverableError(err instanceof Error ? err.message : String(err));
  }
}

/** Deterministic per (run, promotion): reproducible sample, no RNG state to reason about. */
function sampled(runId: string, promotionId: string, rate: number): boolean {
  if (rate <= 0) return false;
  if (rate >= 1) return true;
  const h = sha256(`${runId}:${promotionId}`).slice(0, 8);
  return parseInt(h, 16) / 0xffffffff < rate;
}

function comparable(pb: PromotionWithBrand): ComparablePromotion {
  const p = pb.promotion;
  return {
    title: p.title,
    description: p.description,
    imageUrl: p.imageUrl,
    startsAt: p.startsAt,
    endsAt: p.endsAt,
    brandSourceId: pb.brand.sourceId,
    collection: p.collection,
  };
}

async function runVerify(
  ctx: WorkerContext,
  payload: VerifyJobPayload,
  tracker: RunTracker<VerifyState>,
  signal: AbortSignal,
  log: WorkerContext["log"],
): Promise<VerificationCounts> {
  const { db, env, adapter } = ctx;
  const tz = adapter.timezone;
  const portalId = payload.portalId;
  const now = () => new Date();

  const promos = await promotionsRepo.listActivePromotionsWithBrand(db, portalId, payload.promotionIds);
  if (promos.length === 0) {
    log.info("nothing to verify");
    return { checked: 0, clean: 0, changed: 0, missingAtSource: 0, unverifiable: 0 };
  }

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

  // Stage 1: sitemap (+robots) — one request each.
  discovery = await adapter.discover(actx);
  const delay = effectiveDelayMs(env.SCRAPE_MIN_DELAY_MS, discovery.crawlDelayMs, env.SCRAPE_RESPECT_CRAWL_DELAY);
  if (delay !== env.SCRAPE_MIN_DELAY_MS) throttle = ctx.makeThrottle(delay);

  // Stage 2: listing — one request.
  const listing = new Map<string, ScrapedListingRow>();
  for (const row of await adapter.fetchListing(actx)) listing.set(row.sourceId, row);

  const findings: findingsRepo.FindingWrite[] = [];
  const record = (pb: PromotionWithBrand, kind: VerificationOutcome, fieldChanges: FieldChange[], reason: string | null, evidence: FindingEvidence) => {
    findings.push({ runId: payload.runId, promotionId: pb.promotion.id, kind, fieldChanges, reason, evidence });
    tracker.update((s) => {
      s.checked += 1;
      if (kind === "clean") s.clean += 1;
      else if (kind === "changed") s.changed += 1;
      else if (kind === "missing_at_source") s.missing += 1;
      else s.unverifiable += 1;
    });
  };

  // Stage 3: per promotion, decide from cheap evidence whether a detail fetch is warranted.
  for (const pb of promos) {
    if (signal.aborted) throw new AbortedError(signal.reason);
    const p = pb.promotion;
    const url = adapter.canonicalize(p.canonicalUrl);
    const row = listing.get(p.sourceId);
    const entry = discovery.sitemap.get(url);
    const inSitemap = entry != null;
    const inListing = row != null;
    const stored = comparable(pb);
    const base: Omit<FindingEvidence, "checkedVia" | "detailStatus"> = { inSitemap, inListing, url };

    if (!row) {
      // Gone from the listing. Confirm with the page itself before calling it missing.
      const r = await tryFetchDetail(ctx, actx, row ?? rowFromStored(pb, url), url);
      if (r.kind === "missing") {
        record(pb, "missing_at_source", [], null, { ...base, checkedVia: "detail", detailStatus: r.status });
      } else if (r.kind === "ok") {
        const changes: FieldChange[] = [{ field: "listed", before: true, after: false }, ...detailDiff(stored, r.fresh, tz)];
        record(pb, "changed", changes, null, { ...base, checkedVia: "detail", detailStatus: r.status });
      } else {
        record(pb, "unverifiable", [], r.reason, { ...base, checkedVia: "detail", detailStatus: r.status });
      }
      continue;
    }

    const endsOnFromRow = row.endSerial != null ? dayInZone(excelSerialToEndOfDay(row.endSerial, tz), tz) : null;
    const flags: FieldName[] = listingFlags(stored, row, endsOnFromRow, tz);
    const stale = entry?.lastmod != null && entry.lastmod > p.scrapedAt;
    const isSampled = sampled(payload.runId, p.id, payload.sampleRate);

    if (flags.length || stale || isSampled) {
      const r = await tryFetchDetail(ctx, actx, row, url);
      if (r.kind === "ok") {
        const changes = detailDiff(stored, r.fresh, tz);
        record(pb, changes.length ? "changed" : "clean", changes, null, { ...base, checkedVia: "detail", detailStatus: r.status, listingFlags: flags });
      } else if (r.kind === "missing") {
        record(pb, "missing_at_source", [], null, { ...base, checkedVia: "detail", detailStatus: r.status, listingFlags: flags });
      } else {
        // Listing evidence alone never asserts a change.
        record(pb, "unverifiable", [], r.reason, { ...base, checkedVia: "detail", detailStatus: r.status, listingFlags: flags });
      }
    } else {
      record(pb, "clean", [], null, { ...base, checkedVia: "listing", detailStatus: null });
    }
  }

  await findingsRepo.insertFindings(db, findings);
  const at = now();
  for (const f of findings) {
    await promotionsRepo.updateVerificationState(db, f.promotionId, { at, outcome: f.kind, runId: payload.runId });
  }
  const s = tracker.state;
  return { checked: s.checked, clean: s.clean, changed: s.changed, missingAtSource: s.missing, unverifiable: s.unverifiable };
}

type DetailResult =
  | { kind: "ok"; fresh: ComparablePromotion; status: number }
  | { kind: "missing"; status: number | null }
  | { kind: "error"; reason: string; status: number | null };

async function tryFetchDetail(ctx: WorkerContext, actx: AdapterContext, row: ScrapedListingRow, url: string): Promise<DetailResult> {
  const { adapter } = ctx;
  const tz = adapter.timezone;
  try {
    const fetched = await adapter.fetchPromotion(actx, { ...row, detailUrl: url });
    const p = fetched.promotion;
    if (!p.jsonLd && !p.description) {
      // The portal serves a generic page for unknown deals; no JSON-LD and no description means "not a deal page".
      return { kind: "missing", status: fetched.status };
    }
    return {
      kind: "ok",
      status: fetched.status,
      fresh: {
        title: p.title,
        description: p.description,
        imageUrl: p.imageUrl,
        startsAt: p.startsAt ? new Date(p.startsAt) : null,
        endsAt: p.endsAt ? new Date(p.endsAt) : p.endSerial != null ? excelSerialToEndOfDay(p.endSerial, tz) : null,
        brandSourceId: p.brandSourceId,
        collection: p.collection,
      },
    };
  } catch (err) {
    if (err instanceof AbortedError) throw err;
    if (isScrapeError(err)) {
      if (err.code === "http_error" && (err.status === 404 || err.status === 410)) return { kind: "missing", status: err.status };
      const reason = err.code === "http_error" ? `http_${err.status}` : err.code;
      return { kind: "error", reason, status: err.status };
    }
    return { kind: "error", reason: err instanceof Error ? err.name : "unknown", status: null };
  }
}

/** A synthetic listing row for promotions that are no longer on the listing, so the deal parser has its inputs. */
function rowFromStored(pb: PromotionWithBrand, url: string): ScrapedListingRow {
  const p = pb.promotion;
  return {
    sourceId: p.sourceId,
    title: p.title,
    brandName: pb.brand.name,
    brandSourceId: pb.brand.sourceId,
    imageUrl: p.imageUrl,
    startSerial: null,
    endSerial: null,
    collection: p.collection,
    detailUrl: url,
    endsText: null,
  };
}
