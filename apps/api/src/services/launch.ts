import { randomUUID } from "node:crypto";
import { and, eq, gte, inArray } from "drizzle-orm";
import { runsRepo, tables } from "@field-agent/db";
import { can, JOB, ScrapeOptionsSchema, type ScrapeOptions, type SessionUser } from "@field-agent/shared";
import type { AppDeps } from "../deps.js";
import { HttpError } from "../plugins/error-handler.js";

export type LaunchInput = {
  type: "scrape" | "verify"; user?: SessionUser | null; actor?: string;
  options?: ScrapeOptions; sampleRate?: number; promotionIds?: string[];
  parentRunId?: string; cycleId?: string;
};

export function enforceLaunchPolicy(deps: Pick<AppDeps, "env">, input: LaunchInput) {
  const options = ScrapeOptionsSchema.parse(input.options ?? {});
  const sampleRate = input.sampleRate ?? deps.env.VERIFY_SAMPLE_RATE;
  if (input.user && !can(input.user.role, input.type)) throw new HttpError(403, "FORBIDDEN", "Your role cannot launch jobs");
  if (input.user?.role === "reviewer" && (input.type === "scrape"
    ? options.force || !options.fetchDetails || !options.fetchBrands || options.maxItems != null
    : sampleRate !== deps.env.VERIFY_SAMPLE_RATE || (input.promotionIds?.length ?? 0) > 25)) {
    throw new HttpError(403, "BOUNDED_CONTROLS", "Reviewers can run incremental scrapes and quick verification checks of up to 25 selected records");
  }
  return { options, sampleRate, promotionIds: input.promotionIds ? [...new Set(input.promotionIds)].sort() : undefined };
}

/** One launch path for manual work, retries, scheduled stages and bootstrapping. */
export async function launch(deps: AppDeps, input: LaunchInput) {
  const policy = enforceLaunchPolicy(deps, input);
  const portalId = deps.env.PORTAL_ID;
  const actor = input.user?.email ?? input.actor ?? "local operator";
  const queue = deps.queues[input.type];
  const table = input.type === "scrape" ? tables.scrapeRuns : tables.verificationRuns;
  const lockKey = `fa:launch:${portalId}`;
  const token = randomUUID();
  let acquired = false;
  try {
    if (deps.redis.status !== "ready") throw new Error("Redis is disconnected");
    acquired = (await deps.redis.set(lockKey, token, "PX", 30_000, "NX")) === "OK";
    if (!acquired) throw new HttpError(409, "LAUNCH_BUSY", "Another launch is being processed; try again shortly");
    const schedule = await deps.db.query.portalSchedules.findFirst({ where: eq(tables.portalSchedules.portalId, portalId) });
    if (schedule?.activeCycleId && schedule.activeCycleId !== input.cycleId) throw new HttpError(409, "CYCLE_BUSY", "A scheduled cycle is active; wait for it to finish");
    if (input.cycleId) {
      const [existingStage] = await deps.db.select().from(table).where(eq(table.cycleId, input.cycleId)).limit(1);
      if (existingStage) return { jobId: existingStage.id, runId: existingStage.id, reused: true, statusUrl: `/${input.type}/${existingStage.id}` };
    }
    const active = await deps.db.select().from(table).where(and(eq(table.portalId, portalId), inArray(table.status, ["queued", "running", "stalled"])));
    for (const row of active) {
      const job = await queue.getJob(row.id);
      if (!job) {
        await deps.db.update(table).set({ status: "failed", error: "Orphaned run: queue confirms the job no longer exists", finishedAt: new Date() }).where(eq(table.id, row.id));
        continue;
      }
      const state = await job.getState();
      if (state === "completed" || state === "failed") {
        await deps.db.update(table).set({ status: "failed", error: `Run did not finalize before queue job became ${state}`, finishedAt: new Date() }).where(eq(table.id, row.id));
        continue;
      }
      const data = job.data;
      const identical = input.type === "scrape"
        ? JSON.stringify("options" in data ? data.options : null) === JSON.stringify(policy.options)
        : "sampleRate" in data && data.sampleRate === policy.sampleRate && JSON.stringify(data.promotionIds ?? []) === JSON.stringify(policy.promotionIds ?? []);
      if (identical && !input.parentRunId && !input.cycleId) return { jobId: row.id, runId: row.id, reused: true, statusUrl: `/${input.type}/${row.id}` };
      throw new HttpError(409, "ACTIVE_WORK", "Work of this type is already active. Wait for it to finish or cancel it first");
    }
    if (input.user?.role === "reviewer") {
      const [recent] = await deps.db.select({ id: table.id }).from(table).where(and(eq(table.triggeredBy, actor), gte(table.queuedAt, new Date(Date.now() - 300_000)))).limit(1);
      if (recent) throw new HttpError(429, "REVIEWER_COOLDOWN", "Reviewer jobs have a five-minute cooldown per action");
    }
    const id = randomUUID();
    const common = { id, portalId, triggeredBy: actor, parentRunId: input.parentRunId, cycleId: input.cycleId };
    if (input.type === "scrape") await deps.db.insert(tables.scrapeRuns).values({ ...common, options: policy.options });
    else await deps.db.insert(tables.verificationRuns).values({ ...common, sampleRate: policy.sampleRate, options: { promotionIds: policy.promotionIds } });
    try {
      if (input.type === "scrape") await deps.queues.scrape.add(JOB.scrapePortal, { portalId, runId: id, requestedBy: actor, options: policy.options }, { jobId: id });
      else await deps.queues.verify.add(JOB.verifyPortal, { portalId, runId: id, requestedBy: actor, sampleRate: policy.sampleRate, promotionIds: policy.promotionIds }, { jobId: id });
    } catch (err) {
      await deps.db.update(table).set({ status: "failed", error: "Queue unavailable during launch", finishedAt: new Date() }).where(eq(table.id, id));
      throw err;
    }
    return { jobId: id, runId: id, reused: false, statusUrl: `/${input.type}/${id}` };
  } catch (err) {
    if (err instanceof HttpError) throw err;
    throw new HttpError(503, "QUEUE_UNAVAILABLE", "Queue availability could not be established. No active run was reused");
  } finally {
    if (acquired) await deps.redis.eval("if redis.call('GET',KEYS[1]) == ARGV[1] then return redis.call('DEL',KEYS[1]) end return 0", 1, lockKey, token).catch(() => {});
  }
}

export async function retryRun(deps: AppDeps, id: string, user: SessionUser | null) {
  const scrape = await runsRepo.getScrapeRun(deps.db, id);
  const row = scrape ?? await runsRepo.getVerificationRun(deps.db, id);
  if (!row) throw new HttpError(404, "NOT_FOUND", "Run not found");
  if (!["failed", "completed_with_errors", "cancelled", "stalled"].includes(row.status)) throw new HttpError(409, "NOT_RETRYABLE", "This run is not eligible for retry");
  if (row.status === "stalled") throw new HttpError(409, "CANCEL_FIRST", "Cancel the stalled job and wait for acknowledgement before retrying");
  return scrape ? launch(deps, { type: "scrape", user, parentRunId: id, options: scrape.options })
    : launch(deps, { type: "verify", user, parentRunId: id, sampleRate: "sampleRate" in row ? row.sampleRate : undefined, promotionIds: "promotionIds" in row.options ? row.options.promotionIds : undefined });
}

export async function cancelRun(deps: AppDeps, id: string, user: SessionUser | null) {
  const scrape = await runsRepo.getScrapeRun(deps.db, id);
  const row = scrape ?? await runsRepo.getVerificationRun(deps.db, id);
  if (!row) throw new HttpError(404, "NOT_FOUND", "Run not found");
  const type = scrape ? "scrape" : "verify";
  if (user && !can(user.role, type)) throw new HttpError(403, "FORBIDDEN", "Your role cannot cancel jobs");
  const table = scrape ? tables.scrapeRuns : tables.verificationRuns;
  if (!["queued", "running", "stalled"].includes(row.status)) return { status: row.status };
  await deps.db.update(table).set({ cancelRequestedAt: new Date() }).where(eq(table.id, id));
  try {
    const job = await deps.queues[type].getJob(id);
    if (job) await job.remove(); // BullMQ refuses removal while a worker holds the lock.
    await deps.db.update(table).set({ status: "cancelled", finishedAt: new Date() }).where(eq(table.id, id));
    return { status: "cancelled" };
  } catch {
    return { status: "cancellation_requested" };
  }
}
