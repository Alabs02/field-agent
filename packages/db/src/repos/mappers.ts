import type {
  Brand,
  BrandSummary,
  Promotion,
  ScrapeRun,
  VerificationRun,
} from "@field-agent/shared";
import type { brands, promotions, scrapeRuns, verificationRuns } from "../schema/index.js";

export type BrandRow = typeof brands.$inferSelect;
export type PromotionRow = typeof promotions.$inferSelect;
export type ScrapeRunRow = typeof scrapeRuns.$inferSelect;
export type VerificationRunRow = typeof verificationRuns.$inferSelect;

export const iso = (d: Date | null | undefined): string | null => (d ? d.toISOString() : null);
const isoReq = (d: Date): string => d.toISOString();

export function brandSummary(b: BrandRow): BrandSummary {
  return {
    id: b.id,
    name: b.name,
    slug: b.slug,
    sourceId: b.sourceId,
    websiteUrl: b.websiteUrl,
    logoUrl: b.logoUrl,
  };
}

export function brandToApi(b: BrandRow): Brand {
  return {
    id: b.id,
    portalId: b.portalId as Brand["portalId"],
    sourceId: b.sourceId,
    slug: b.slug,
    name: b.name,
    sourceUrl: b.sourceUrl,
    websiteUrl: b.websiteUrl,
    websiteIsRedirect: b.websiteIsRedirect,
    hours: b.hours ?? null,
    hoursRaw: b.hoursRaw,
    phone: b.phone,
    location: b.location,
    description: b.description,
    logoUrl: b.logoUrl,
    categories: b.categories,
    socialLinks: b.socialLinks,
    storePageFetchedAt: iso(b.storePageFetchedAt),
    createdAt: isoReq(b.createdAt),
    updatedAt: isoReq(b.updatedAt),
  };
}

export function promotionToApi(p: PromotionRow, b: BrandRow, extra: { changedFields?: string[] | null } = {}): Promotion {
  return {
    id: p.id,
    portalId: p.portalId as Promotion["portalId"],
    sourceId: p.sourceId,
    collection: p.collection,
    title: p.title,
    description: p.description,
    descriptionHtml: p.descriptionHtml,
    imageUrl: p.imageUrl,
    startsAt: iso(p.startsAt),
    endsAt: iso(p.endsAt),
    dateSource: p.dateSource,
    canonicalUrl: p.canonicalUrl,
    brand: brandSummary(b),
    firstSeenAt: isoReq(p.firstSeenAt),
    lastSeenAt: isoReq(p.lastSeenAt),
    scrapedAt: isoReq(p.scrapedAt),
    detailFetchedAt: iso(p.detailFetchedAt),
    removedAt: iso(p.removedAt),
    verification: {
      lastVerifiedAt: iso(p.lastVerifiedAt),
      lastOutcome: p.lastVerificationOutcome,
      lastRunId: p.lastVerificationRunId,
      coverage: p.lastVerificationCoverage,
      changedFields: extra.changedFields ?? [],
    },
  };
}

const durationMs = (start: Date | null, end: Date | null): number | null =>
  start && end ? Math.max(0, end.getTime() - start.getTime()) : null;

export function scrapeRunToApi(r: ScrapeRunRow): ScrapeRun {
  return {
    type: "scrape",
    id: r.id,
    portalId: r.portalId as ScrapeRun["portalId"],
    jobId: r.id,
    triggeredBy: r.triggeredBy,
    parentRunId: r.parentRunId,
    cycleId: r.cycleId,
    cancelRequestedAt: iso(r.cancelRequestedAt),
    status: r.status,
    phase: r.phase,
    progress: r.progress,
    attemptsMade: r.attemptsMade,
    counts: {
      attempted: r.attempted,
      persisted: r.persisted,
      updated: r.updated,
      skipped: r.skipped,
      failed: r.failed,
    },
    brandCounts: { attempted: r.brandsAttempted, failed: r.brandsFailed },
    requestsMade: r.requestsMade,
    errors: r.errors,
    error: r.error,
    options: r.options,
    queuedAt: isoReq(r.queuedAt),
    startedAt: iso(r.startedAt),
    heartbeatAt: iso(r.heartbeatAt),
    finishedAt: iso(r.finishedAt),
    durationMs: durationMs(r.startedAt, r.finishedAt),
  };
}

export function verificationRunToApi(r: VerificationRunRow): VerificationRun {
  return {
    type: "verify",
    id: r.id,
    portalId: r.portalId as VerificationRun["portalId"],
    jobId: r.id,
    triggeredBy: r.triggeredBy,
    parentRunId: r.parentRunId,
    cycleId: r.cycleId,
    cancelRequestedAt: iso(r.cancelRequestedAt),
    status: r.status,
    attemptsMade: r.attemptsMade,
    sampleRate: r.sampleRate,
    counts: {
      checked: r.checked,
      clean: r.clean,
      changed: r.changed,
      missingAtSource: r.missing,
      unverifiable: r.unverifiable,
    },
    requestsMade: r.requestsMade,
    errors: r.errors,
    error: r.error,
    queuedAt: isoReq(r.queuedAt),
    startedAt: iso(r.startedAt),
    heartbeatAt: iso(r.heartbeatAt),
    finishedAt: iso(r.finishedAt),
    durationMs: durationMs(r.startedAt, r.finishedAt),
  };
}
