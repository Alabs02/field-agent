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
  excelSerialToStartOfDay,
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
import { watchCancellation } from "../lib/cancellation.js";
import { isSourceBlocked, recordRunNotice } from "../lib/notify.js";

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
    runRow.errors,
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
  const cancellation = watchCancellation(db, "verify", payload.runId);

  try {
    await cancellation.check();
    const result = await withTimeout(env.VERIFY_JOB_TIMEOUT_MS, (signal) => runVerify(ctx, payload, tracker, signal, log), cancellation.signal);
    tracker.stop();
    const finalStatus = tracker.state.unverifiable === 0 ? "completed" : "completed_with_errors";
    tracker.update((s) => {
      s.status = finalStatus;
    });
    await tracker.flush(true);
    await runsRepo.updateVerificationRun(db, payload.runId, { status: finalStatus, finishedAt: new Date() });
    log.info({ counts: result, requests: tracker.requestsMade }, "verification finished");
    // The run's own status says how processing went; drift is a separate, data-level notice.
    const discrepancies = result.changed + result.missingAtSource;
    if (discrepancies > 0) {
      await recordRunNotice(db, log, {
        portalId: payload.portalId,
        runId: payload.runId,
        eventKey: `drift:${payload.runId}`,
        action: "verification.drift_detected",
        actor: payload.requestedBy,
        label: `Verification ${payload.runId.slice(0, 8)}`,
        message: `${discrepancies} discrepanc${discrepancies === 1 ? "y" : "ies"} observed at the source: ${result.changed} changed, ${result.missingAtSource} gone from source`,
        href: `/app/verify/${payload.runId}`,
        severity: "warning",
        after: { ...result },
      });
    }
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
      status: cancellation.signal.aborted ? "cancelled" : retryable ? "queued" : "failed",
      error: err instanceof Error ? err.message : String(err),
      finishedAt: retryable ? null : new Date(),
    });
    if (isSourceBlocked(err)) {
      await recordRunNotice(db, log, {
        portalId: payload.portalId,
        runId: payload.runId,
        eventKey: `blocked:${payload.runId}`,
        action: "source.blocked",
        actor: payload.requestedBy,
        label: `Verification ${payload.runId.slice(0, 8)}`,
        message: "The source served an anti-bot challenge. The page was kept as an HTML snapshot for review; no further requests were made in this run",
        href: `/app/verify/${payload.runId}`,
        severity: "error",
      });
    }
    log.error({ err, retryable, timedOut }, "verification failed");
    if (retryable) throw err;
    throw new UnrecoverableError(err instanceof Error ? err.message : String(err));
  } finally {
    cancellation.stop();
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

  // Removed records are re-checked for a bounded window so a reappearance is caught without
  // paying a detail request forever for every promotion the portal has ever dropped.
  const promos = await promotionsRepo.listActivePromotionsWithBrand(db, portalId, payload.promotionIds, { removedWithinDays: env.VERIFY_REMOVED_WINDOW_DAYS });
  const priorFindings = await findingsRepo.listFindingsForRun(db, payload.runId);
  const alreadyChecked = new Set(priorFindings.map(f => f.promotion.id));
  tracker.update(s => {
    s.checked = priorFindings.length;
    s.clean = priorFindings.filter(f => f.kind === "clean").length;
    s.changed = priorFindings.filter(f => f.kind === "changed").length;
    s.missing = priorFindings.filter(f => f.kind === "missing_at_source").length;
    s.unverifiable = priorFindings.filter(f => f.kind === "unverifiable").length;
  });
  if (promos.length === 0) {
    log.info("nothing to verify");
    return { checked: 0, clean: 0, changed: 0, missingAtSource: 0, unverifiable: 0 };
  }

  let discovery: Discovery | null = null;
  let allowed = (_url: string) => true;
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
    isAllowed: () => allowed,
    onRequest: () => tracker.countRequest(),
  });
  const actx: AdapterContext = { fetch: fetcher, log, signal, now, onRobots: async rules => {
    allowed = rules.isAllowed;
    const delay = effectiveDelayMs(env.SCRAPE_MIN_DELAY_MS, rules.crawlDelayMs, env.SCRAPE_RESPECT_CRAWL_DELAY);
    throttle = ctx.makeThrottle(delay);
    await throttle.cooldown(new URL(adapter.baseUrl).hostname, Date.now() + delay);
  } };

  // Stage 1: sitemap (+robots) — one request each.
  discovery = await adapter.discover(actx);
  const delay = effectiveDelayMs(env.SCRAPE_MIN_DELAY_MS, discovery.crawlDelayMs, env.SCRAPE_RESPECT_CRAWL_DELAY);
  if (delay !== env.SCRAPE_MIN_DELAY_MS) throttle = ctx.makeThrottle(delay);

  // Stage 2: listing — one request.
  const listing = new Map<string, ScrapedListingRow>();
  const listingResult = await adapter.fetchListing(actx);
  for (const row of listingResult.rows) listing.set(row.sourceId, row);

  const record = async (pb: PromotionWithBrand, kind: VerificationOutcome, fieldChanges: FieldChange[], reason: string | null, evidence: FindingEvidence) => {
    const p = pb.promotion;
    await findingsRepo.insertFindings(db, [{ runId: payload.runId, promotionId: p.id, kind, fieldChanges, reason, evidence,
      promotionSnapshot: { id: p.id, sourceId: p.sourceId, title: p.title, canonicalUrl: p.canonicalUrl, brandName: pb.brand.name },
      baselineUpdatedAt: p.updatedAt }]);
    await promotionsRepo.updateVerificationState(db, p.id, { at: now(), outcome: kind, runId: payload.runId, baselineUpdatedAt: p.updatedAt, checkedVia: evidence.checkedVia });
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
    if (alreadyChecked.has(pb.promotion.id)) continue;
    const p = pb.promotion;
    const url = adapter.canonicalize(p.canonicalUrl);
    const row = listing.get(p.sourceId);
    const entry = discovery.sitemap.get(url);
    const inSitemap = entry != null;
    const inListing = row != null;
    const stored = comparable(pb);
    const base: Omit<FindingEvidence, "checkedVia" | "detailStatus"> = { inSitemap, inListing, url };

    if (!row && !listingResult.complete) {
      await record(pb, "unverifiable", [], "listing_incomplete", { ...base, checkedVia: "listing", detailStatus: null });
      continue;
    }
    if (!row) {
      // Gone from the listing. Confirm with the page itself before calling it missing.
      const r = await tryFetchDetail(ctx, actx, row ?? rowFromStored(pb, url), url);
      if (r.kind === "missing") {
        await record(pb, "missing_at_source", [], null, { ...base, checkedVia: "detail", detailStatus: r.status });
      } else if (r.kind === "ok") {
        const changes: FieldChange[] = [{ field: "listed", before: true, after: false }, ...detailDiff(stored, r.fresh, tz)];
        await record(pb, "changed", changes, null, { ...base, checkedVia: "detail", detailStatus: r.status });
      } else {
        await record(pb, "unverifiable", [], r.reason, { ...base, checkedVia: "detail", detailStatus: r.status });
      }
      continue;
    }

    const endsOnFromRow = row.endSerial != null ? dayInZone(excelSerialToEndOfDay(row.endSerial, tz), tz) : null;
    const flags: FieldName[] = listingFlags(stored, row, endsOnFromRow, tz);
    const stale = entry?.lastmod != null && entry.lastmod > (p.detailFetchedAt ?? p.scrapedAt);
    const isSampled = sampled(payload.runId, p.id, payload.sampleRate);

    if (flags.length || stale || isSampled || (p.lastVerificationOutcome != null && p.lastVerificationOutcome !== "clean")) {
      const r = await tryFetchDetail(ctx, actx, row, url);
      if (r.kind === "ok") {
        const changes = detailDiff(stored, r.fresh, tz);
        await record(pb, changes.length ? "changed" : "clean", changes, null, { ...base, checkedVia: "detail", detailStatus: r.status, listingFlags: flags });
      } else if (r.kind === "missing") {
        await record(pb, "missing_at_source", [], null, { ...base, checkedVia: "detail", detailStatus: r.status, listingFlags: flags });
      } else {
        // Listing evidence alone never asserts a change.
        await record(pb, "unverifiable", [], r.reason, { ...base, checkedVia: "detail", detailStatus: r.status, listingFlags: flags });
      }
    } else {
      await record(pb, "clean", [], null, { ...base, checkedVia: "listing", detailStatus: null });
    }
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
        startsAt: p.startsAt ? new Date(p.startsAt) : p.startSerial != null ? excelSerialToStartOfDay(p.startSerial, tz) : null,
        endsAt: p.endsAt ? new Date(p.endsAt) : p.endSerial != null ? excelSerialToEndOfDay(p.endSerial, tz) : null,
        brandSourceId: p.brandSourceId,
        collection: p.collection,
      },
    };
  } catch (err) {
    if (err instanceof AbortedError || (isScrapeError(err) && err.code === "source_blocked")) throw err;
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
