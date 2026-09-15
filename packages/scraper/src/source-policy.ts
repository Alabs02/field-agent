/** Retry-After may be seconds or an HTTP date. Invalid values use a conservative fallback. */
export function retryAfterUntil(value: string | null, now = Date.now()): number {
  if (value && /^\d+(\.\d+)?$/.test(value.trim())) return now + Number(value) * 1000;
  const parsed = value ? Date.parse(value) : NaN;
  return Number.isFinite(parsed) ? Math.max(now, parsed) : now + 60_000;
}

export function isChallengePage(body: string): boolean {
  return /(?:<title[^>]*>\s*(?:just a moment|attention required|access denied)|cf-chl-|captcha-delivery\.com|px-captcha|verify you are human)/i.test(body);
}
