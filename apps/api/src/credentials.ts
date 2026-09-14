import { CAPABILITIES, PERMISSIONS, ROLE_LABELS, type Capability } from "@field-agent/shared";
import { DEMO_USERS } from "./auth.js";
import type { Env } from "./env.js";

/**
 * The demo credentials, rendered for a terminal. Printed by `cli seed` (so
 * `docker compose up` shows them in the migrate service's logs) and by
 * `cli credentials`. README "Demo accounts" documents the same table; the
 * password comes from SEED_DEMO_PASSWORD in both places.
 */

const CAPABILITY_WORDS: Record<Capability, string> = {
  read: "read",
  scrape: "scrape",
  verify: "verify",
  admin: "admin (queues, users)",
};

export interface CredentialRow {
  email: string;
  role: string;
  can: string;
}

export function credentialRows(): CredentialRow[] {
  return DEMO_USERS.map((u) => ({
    email: u.email,
    role: ROLE_LABELS[u.role],
    can: CAPABILITIES.filter((c) => PERMISSIONS[u.role].has(c))
      .map((c) => CAPABILITY_WORDS[c])
      .join(" · "),
  }));
}

function table(headers: string[], rows: string[][]): string[] {
  const widths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i]?.length ?? 0)));
  const line = (l: string, m: string, r: string) => l + widths.map((w) => "─".repeat(w + 2)).join(m) + r;
  const row = (cells: string[]) => "│" + cells.map((c, i) => ` ${c.padEnd(widths[i] ?? 0)} `).join("│") + "│";
  return [line("┌", "┬", "┐"), row(headers), line("├", "┼", "┤"), ...rows.map(row), line("└", "┴", "┘")];
}

export function renderCredentials(env: Pick<Env, "SEED_DEMO_PASSWORD" | "WEB_ORIGIN" | "AUTH_REQUIRED">): string {
  const rows = credentialRows();
  const signIn = `${env.WEB_ORIGIN.split(",")[0]?.trim() ?? "http://localhost:3000"}/login`;
  const out = [
    "",
    "  Demo accounts (all five share one password)",
    "",
    ...table(
      ["email", "role", "can"],
      rows.map((r) => [r.email, r.role, r.can]),
    ).map((l) => "  " + l),
    "",
    `  password   ${env.SEED_DEMO_PASSWORD}`,
    `  sign in    ${signIn}`,
    env.AUTH_REQUIRED
      ? "  auth       required (AUTH_REQUIRED=true): the UI and POST routes need a session"
      : "  auth       optional here (AUTH_REQUIRED=false): the API is open, sign in to see role-gated UI",
    "",
  ];
  return out.join("\n");
}
