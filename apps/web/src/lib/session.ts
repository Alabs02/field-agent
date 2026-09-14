import "server-only";
import type { SessionUser } from "@field-agent/shared";

/**
 * Resolves the signed-in user for server components. Until the auth commit
 * lands this always returns null; the app shell then shows "Not signed in"
 * only when AUTH_REQUIRED is on.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  return null;
}
