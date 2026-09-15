import { Queue, Worker } from "bullmq";
import { and, eq, inArray, sql } from "drizzle-orm";
import { operationsRepo, tables } from "@field-agent/db";
import { QUEUE_PREFIX, type SessionUser } from "@field-agent/shared";
import type { AppDeps } from "../deps.js";
import { HttpError } from "../plugins/error-handler.js";
import { launch } from "./launch.js";

const TERMINAL = ["completed", "completed_with_errors", "failed", "cancelled"];
export const successfulStage = (status: string) => status === "completed" || status === "completed_with_errors";
export const nextDue = (now: Date, hours: number) => new Date(now.getTime() + hours * 3_600_000);

export type StageType = "scrape" | "verify";
export type CyclePlan = { action: "wait" } | { action: "finish"; outcome: string } | { action: "launch"; type: StageType };

/** Stage order: verify the stored baseline first, then refresh; an empty database bootstraps the other way round. */
export const stagesFor = (bootstrap: boolean): readonly [StageType, StageType] => (bootstrap ? ["scrape", "verify"] : ["verify", "scrape"]);

/**
 * Pure decision for one cycle given its linked runs. Discrepancies (completed_with_errors)
 * let the refresh continue; a failed or cancelled first stage ends the cycle without it.
 */
export function planCycle(bootstrap: boolean, first: { status: string } | undefined, second: { status: string } | undefined): CyclePlan {
  const stages = stagesFor(bootstrap);
  if (!first) return { action: "launch", type: stages[0] };
  if (!TERMINAL.includes(first.status)) return { action: "wait" };
  if (!successfulStage(first.status)) return { action: "finish", outcome: first.status };
  if (!second) return { action: "launch", type: stages[1] };
  return TERMINAL.includes(second.status) ? { action: "finish", outcome: second.status } : { action: "wait" };
}

export async function startCycle(deps: AppDeps, user: SessionUser | null = null, manual = false) {
  const portalId = deps.env.PORTAL_ID;
  await operationsRepo.getSchedule(deps.db, portalId);
  return deps.db.transaction(async tx => {
    const [schedule] = await tx.select().from(tables.portalSchedules).where(eq(tables.portalSchedules.portalId, portalId)).for("update");
    if (!schedule) throw new Error("Schedule missing");
    const now = new Date();
    if (!manual && (!schedule.enabled || !schedule.nextRunAt || schedule.nextRunAt > now)) return null;
    const [busy] = await tx.execute(sql`select id from scrape_runs where status in ('queued','running','stalled')
      union all select id from verification_runs where status in ('queued','running','stalled') limit 1`);
    if (schedule.activeCycleId || busy) {
      if (manual) throw new HttpError(409, "CYCLE_BUSY", "A run or scheduled cycle is already active");
      await tx.insert(tables.auditEvents).values({ portalId, eventKey: `schedule-skipped:${portalId}:${schedule.nextRunAt!.toISOString()}`,
        action: "schedule.skipped_busy", actor: "schedule", entityType: "schedule", entityId: portalId, label: "Portal schedule",
        message: "Scheduled cycle skipped because work was already active", before: { dueAt: schedule.nextRunAt!.toISOString() }, href: "/app/schedules", severity: "warning" }).onConflictDoNothing();
      await tx.update(tables.portalSchedules).set({ nextRunAt: nextDue(now, schedule.intervalHours), lastOutcome: "Skipped because busy" }).where(eq(tables.portalSchedules.portalId, portalId));
      return null;
    }
    if (user?.role === "reviewer") {
      const [recent] = await tx.execute(sql`select id from schedule_cycles where actor=${user.email} and started_at > now()-interval '5 minutes' limit 1`);
      if (recent) throw new HttpError(429, "REVIEWER_COOLDOWN", "Reviewer schedule launches have a five-minute cooldown");
    }
    const [inventory] = await tx.execute(sql`select count(*)::int as n from promotions where portal_id=${portalId}`);
    const [cycle] = await tx.insert(tables.scheduleCycles).values({ portalId, actor: user?.email ?? "schedule", coverage: schedule.coverage,
      bootstrap: Number(inventory?.n) === 0, dueAt: manual ? now : schedule.nextRunAt! }).returning();
    await tx.update(tables.portalSchedules).set({ activeCycleId: cycle!.id, lastStartedAt: now,
      nextRunAt: schedule.enabled ? nextDue(now, schedule.intervalHours) : null,
      lastOutcome: "Running" }).where(eq(tables.portalSchedules.portalId, portalId));
    await tx.insert(tables.auditEvents).values({ portalId, eventKey: `cycle:${cycle!.id}`, action: "schedule.cycle_started", actor: cycle!.actor,
      entityType: "schedule_cycle", entityId: cycle!.id, label: "Scheduled cycle", message: "Scheduled cycle started",
      after: { dueAt: cycle!.dueAt.toISOString(), startedAt: now.toISOString(), bootstrap: cycle!.bootstrap }, href: "/app/schedules" });
    return cycle!.id;
  });
}

export async function advanceCycles(deps: AppDeps) {
  const cycles = await deps.db.select().from(tables.scheduleCycles).where(eq(tables.scheduleCycles.status, "running"));
  for (const cycle of cycles) {
    const stages = stagesFor(cycle.bootstrap);
    const linkedScrapes = await deps.db.select().from(tables.scrapeRuns).where(eq(tables.scrapeRuns.cycleId, cycle.id));
    const linkedVerifies = await deps.db.select().from(tables.verificationRuns).where(eq(tables.verificationRuns.cycleId, cycle.id));
    const first = stages[0] === "scrape" ? linkedScrapes[0] : linkedVerifies[0];
    const second = stages[1] === "scrape" ? linkedScrapes[0] : linkedVerifies[0];
    const finish = async (outcome: string) => deps.db.transaction(async tx => {
      const finishedAt = new Date();
      await tx.update(tables.scheduleCycles).set({ status: outcome, finishedAt, firstRunId: first?.id, secondRunId: second?.id }).where(eq(tables.scheduleCycles.id, cycle.id));
      await tx.update(tables.portalSchedules).set({ activeCycleId: null, lastOutcome: outcome }).where(eq(tables.portalSchedules.activeCycleId, cycle.id));
      const stageLabel = (run: { id: string } | undefined, type: string) => (run ? `${type} ${run.id.slice(0, 8)}` : `${type} not started`);
      const succeeded = successfulStage(outcome);
      // Deterministic key: a tick that re-observes the same terminal state cannot duplicate the event.
      await tx.insert(tables.auditEvents).values({ portalId: cycle.portalId, eventKey: `cycle-done:${cycle.id}`, action: "schedule.cycle_finished", actor: cycle.actor,
        entityType: "schedule_cycle", entityId: cycle.id, label: "Scheduled cycle", runId: second?.id ?? first?.id ?? null,
        severity: succeeded ? (outcome === "completed" ? "success" : "warning") : "error", notify: true, href: "/app/schedules",
        message: succeeded ? `Scheduled cycle finished: ${outcome.replaceAll("_", " ")}` : `Scheduled cycle stopped after the first stage: ${outcome}`,
        after: { outcome, bootstrap: cycle.bootstrap, dueAt: cycle.dueAt.toISOString(), startedAt: cycle.startedAt.toISOString(), finishedAt: finishedAt.toISOString(),
          stages: [stageLabel(first, stages[0]), stageLabel(second, stages[1])] } }).onConflictDoNothing();
    });
    const plan = planCycle(cycle.bootstrap, first, second);
    if (plan.action === "wait") continue;
    if (plan.action === "finish") { await finish(plan.outcome); continue; }
    // Recover after an API restart from cycle_id on the run; never launch the same stage twice.
    // A scheduled scrape is always the incremental refresh; a full refresh is an explicit manual choice.
    const launched = await launch(deps, { type: plan.type, actor: `${cycle.actor} (schedule)`, cycleId: cycle.id,
      options: plan.type === "scrape" ? { force: false, fetchDetails: true, fetchBrands: true } : undefined,
      sampleRate: cycle.coverage === "full" ? 1 : deps.env.VERIFY_SAMPLE_RATE });
    await deps.db.update(tables.scheduleCycles).set(first ? { secondRunId: launched.runId } : { firstRunId: launched.runId }).where(eq(tables.scheduleCycles.id, cycle.id));
  }
}

export async function reconcileRunHealth(deps: AppDeps) {
  for (const type of ["scrape", "verify"] as const) {
    const table = type === "scrape" ? tables.scrapeRuns : tables.verificationRuns;
    const rows = await deps.db.select().from(table).where(inArray(table.status, ["queued", "running", "stalled"]));
    for (const row of rows) {
      // Connectivity failures escape to the monitor, never masquerade as missing jobs.
      const job = await deps.queues[type].getJob(row.id);
      if (!job) {
        await deps.db.update(table).set({ status: row.cancelRequestedAt ? "cancelled" : "failed", error: "Orphaned run: queue job no longer exists", finishedAt: new Date() }).where(eq(table.id, row.id));
        continue;
      }
      const state = await job.getState();
      if (state === "failed") {
        await deps.db.update(table).set({ status: row.cancelRequestedAt ? "cancelled" : "failed", error: job.failedReason || "Queue job failed", finishedAt: new Date() }).where(eq(table.id, row.id));
      } else if (row.status === "running" && Date.now() - (row.heartbeatAt?.getTime() ?? 0) > 60_000) {
        await deps.db.update(table).set({ status: "stalled", error: "Worker heartbeat has been absent for more than 60 seconds" }).where(and(eq(table.id, row.id), eq(table.status, "running")));
      }
    }
  }
}

export async function startOperationsMonitor(deps: AppDeps, log: { error: (obj: object, message: string) => void }) {
  const name = "portal-operations";
  const queue = new Queue(name, { connection: deps.redis, prefix: QUEUE_PREFIX });
  await queue.setGlobalConcurrency(1);
  const worker = new Worker(name, async () => {
    await reconcileRunHealth(deps);
    await startCycle(deps);
    await advanceCycles(deps);
  }, { connection: deps.redis, prefix: QUEUE_PREFIX, concurrency: 1 });
  worker.on("error", err => log.error({ err }, "Operations monitor disconnected"));
  worker.on("failed", (_job, err) => log.error({ err }, "Operations monitor tick failed"));
  await queue.upsertJobScheduler("portal-operations-v1", { every: 30_000 }, { name: "reconcile", data: {}, opts: { removeOnComplete: 10, removeOnFail: 50 } });
  await operationsRepo.getSchedule(deps.db, deps.env.PORTAL_ID);
  await deps.db.update(tables.portalSchedules).set({ schedulerSynced: true }).where(eq(tables.portalSchedules.portalId, deps.env.PORTAL_ID));
  return async () => { await worker.close(); await queue.close(); };
}
