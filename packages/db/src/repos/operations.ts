import { and, count, desc, eq, gte, ilike, inArray, isNull, lte, or, sql } from "drizzle-orm";
import type { AuditEvent, AuditQuery, ScheduleInput } from "@field-agent/shared";
import type { Database } from "../client.js";
import { auditEvents, notificationReceipts, portalSchedules } from "../schema/index.js";

export async function appendAudit(db: Database, event: typeof auditEvents.$inferInsert) {
  await db.insert(auditEvents).values(event).onConflictDoNothing();
}

export async function listAudit(db: Database, portalId: string, q: AuditQuery, notifications = false, userId?: string) {
  const where = and(eq(auditEvents.portalId, portalId),
    notifications ? eq(auditEvents.notify, true) : undefined,
    q.search ? or(ilike(auditEvents.label, `%${q.search}%`), ilike(auditEvents.message, `%${q.search}%`)) : undefined,
    q.action ? eq(auditEvents.action, q.action) : undefined,
    q.actor ? ilike(auditEvents.actor, `%${q.actor}%`) : undefined,
    q.entityId ? eq(auditEvents.entityId, q.entityId) : undefined,
    q.entityType ? inArray(auditEvents.entityType, q.entityType.split(",").map((s) => s.trim()).filter(Boolean)) : undefined,
    q.runId ? eq(auditEvents.runId, q.runId) : undefined,
    q.severity ? eq(auditEvents.severity, q.severity) : undefined,
    q.from ? gte(auditEvents.createdAt, new Date(q.from)) : undefined,
    q.to ? lte(auditEvents.createdAt, new Date(q.to)) : undefined);
  const [totals] = await db.select({ n: count() }).from(auditEvents).where(where);
  const rows = await db.select({ event: auditEvents, readAt: notificationReceipts.readAt }).from(auditEvents)
    .leftJoin(notificationReceipts, and(eq(notificationReceipts.eventId, auditEvents.id), eq(notificationReceipts.userId, userId ?? "")))
    .where(where).orderBy(desc(auditEvents.createdAt), desc(auditEvents.id)).limit(q.pageSize).offset((q.page - 1) * q.pageSize);
  return { items: rows.map(({ event, readAt }) => ({ ...event, createdAt: event.createdAt.toISOString(), readAt: readAt?.toISOString() ?? null })), total: totals?.n ?? 0 };
}

export async function unreadCount(db: Database, portalId: string, userId: string) {
  const [row] = await db.select({ n: count() }).from(auditEvents)
    .leftJoin(notificationReceipts, and(eq(notificationReceipts.eventId, auditEvents.id), eq(notificationReceipts.userId, userId)))
    .where(and(eq(auditEvents.portalId, portalId), eq(auditEvents.notify, true), isNull(notificationReceipts.id)));
  return row?.n ?? 0;
}

export async function markRead(db: Database, portalId: string, userId: string, eventId?: string) {
  // A single INSERT SELECT handles all unread history without a reporting cap.
  await db.execute(sql`insert into notification_receipts(user_id,event_id)
    select ${userId}, id from audit_events where portal_id=${portalId} and notify=true
    ${eventId ? sql`and id=${eventId}::uuid` : sql``} on conflict(user_id,event_id) do nothing`);
}

export async function getSchedule(db: Database, portalId: string) {
  await db.insert(portalSchedules).values({ portalId }).onConflictDoNothing();
  const row = await db.query.portalSchedules.findFirst({ where: eq(portalSchedules.portalId, portalId) });
  return row!;
}

export function scheduleToApi(row: typeof portalSchedules.$inferSelect) {
  return { ...row, nextRunAt: row.nextRunAt?.toISOString() ?? null, updatedAt: row.updatedAt.toISOString(), lastStartedAt: row.lastStartedAt?.toISOString() ?? null };
}

export async function updateSchedule(db: Database, portalId: string, input: ScheduleInput, actor: string) {
  return db.transaction(async tx => {
    const [previous] = await tx.select().from(portalSchedules).where(eq(portalSchedules.portalId, portalId)).for("update");
    if (!previous) throw new Error("Schedule has not been initialized");
    const now = new Date();
    const [row] = await tx.update(portalSchedules).set({ ...input, updatedAt: now, updatedBy: actor,
      nextRunAt: input.enabled ? new Date(now.getTime() + input.intervalHours * 3_600_000) : null,
    }).where(eq(portalSchedules.portalId, portalId)).returning();
    await tx.insert(auditEvents).values({ portalId, eventKey: crypto.randomUUID(), action: "schedule.updated", actor,
      entityType: "schedule", entityId: portalId, label: "Portal schedule", before: scheduleToApi(previous), after: scheduleToApi(row!),
      message: input.enabled ? `Schedule enabled: every ${input.intervalHours} hours, ${input.coverage} verification` : "Schedule paused",
      notify: true, href: "/app/schedules" });
    return scheduleToApi(row!);
  });
}

export type AuditWrite = Omit<AuditEvent, "id" | "createdAt">;
