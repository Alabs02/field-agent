import { normalizeText, sha256 } from "./normalize.js";

/**
 * Secondary identity for a promotion: the same campaign re-posted under a new
 * Placewise id has the same brand, title, and end day. Used to relink instead
 * of duplicating.
 */
export function promotionFingerprint(title: string, brandSourceId: string, endsOn: string | null): string {
  const t = (normalizeText(title) ?? "").toLowerCase();
  return sha256(`${t}|${brandSourceId}|${endsOn ?? ""}`);
}
