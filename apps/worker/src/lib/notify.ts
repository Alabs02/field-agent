import { operationsRepo, type Database } from "@field-agent/db";
import type { AuditEvent } from "@field-agent/shared";
import type { Logger } from "@field-agent/scraper";

/**
 * Application-level audit events the database triggers cannot derive from a row change:
 * a drift summary for a verification run, or a source block. Keys are deterministic per
 * run so a BullMQ retry that reaches the same point again does not duplicate the notice.
 * A failure to write the notice is logged and never fails the run itself.
 */
export async function recordRunNotice(
  db: Database,
  log: Logger,
  notice: { portalId: string; runId: string; eventKey: string; action: string; actor: string | null; label: string; message: string; href: string; severity: AuditEvent["severity"]; after?: Record<string, unknown> },
): Promise<void> {
  try {
    await operationsRepo.appendAudit(db, {
      portalId: notice.portalId,
      eventKey: notice.eventKey,
      action: notice.action,
      actor: notice.actor ?? "system",
      entityType: "run",
      entityId: notice.runId,
      label: notice.label,
      runId: notice.runId,
      severity: notice.severity,
      message: notice.message,
      href: notice.href,
      notify: true,
      after: notice.after,
    });
  } catch (err) {
    log.warn({ err, eventKey: notice.eventKey }, "could not record run notice");
  }
}

export const isSourceBlocked = (err: unknown): boolean => typeof err === "object" && err !== null && "code" in err && (err as { code?: unknown }).code === "source_blocked";
