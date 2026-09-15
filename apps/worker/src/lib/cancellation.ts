import { runsRepo, type Database } from "@field-agent/db";
import { AbortedError } from "@field-agent/scraper";

export function watchCancellation(db: Database, type: "scrape" | "verify", id: string) {
  const controller = new AbortController();
  let polling = false;
  const check = async () => {
    if (polling) return;
    polling = true;
    try {
      const row = type === "scrape" ? await runsRepo.getScrapeRun(db, id) : await runsRepo.getVerificationRun(db, id);
      if (row?.cancelRequestedAt) controller.abort(new AbortedError(new Error("Cancellation requested by operator")));
    } finally { polling = false; }
  };
  const timer = setInterval(() => { void check().catch(() => {}); }, 1_000);
  return { signal: controller.signal, check, stop: () => clearInterval(timer) };
}
