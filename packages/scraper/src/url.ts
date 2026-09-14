/**
 * The portal answers 301 for the apex host and for paths without a trailing
 * slash. Canonicalizing up front avoids both hops on every request and keeps
 * stored URLs comparable across runs.
 */
export function makeCanonicalizer(baseUrl: string) {
  const base = new URL(baseUrl);
  const canonicalHost = base.hostname.startsWith("www.") ? base.hostname : `www.${base.hostname}`;
  const bareHost = canonicalHost.replace(/^www\./, "");

  return function canonicalize(input: string): string {
    const u = new URL(input, base);
    const host = u.hostname.toLowerCase();
    if (host === bareHost || host === canonicalHost) {
      u.protocol = "https:";
      u.hostname = canonicalHost;
      u.hash = "";
      u.search = "";
      if (!/\.[a-z0-9]{2,5}$/i.test(u.pathname) && !u.pathname.endsWith("/")) {
        u.pathname = `${u.pathname}/`;
      }
    }
    return u.toString();
  };
}

export function hostOf(url: string): string {
  return new URL(url).hostname.toLowerCase();
}

/** Known affiliate/redirect hosts. Kept as-is and never followed. */
export const AFFILIATE_HOSTS = new Set([
  "tkqlhce.com",
  "www.tkqlhce.com",
  "jdoqocy.com",
  "www.jdoqocy.com",
  "anrdoezrs.net",
  "www.anrdoezrs.net",
  "dpbolvw.net",
  "www.dpbolvw.net",
  "kqzyfj.com",
  "www.kqzyfj.com",
  "linksynergy.com",
  "click.linksynergy.com",
  "shareasale.com",
  "www.shareasale.com",
  "awin1.com",
  "www.awin1.com",
  "prf.hn",
  "go.redirectingat.com",
  "go.skimresources.com",
  "rstyle.me",
]);

export function isAffiliateUrl(url: string | null): boolean {
  if (!url) return false;
  try {
    return AFFILIATE_HOSTS.has(new URL(url).hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function safeHttpUrl(input: string | null | undefined, base?: string): string | null {
  if (!input) return null;
  try {
    const u = new URL(input.trim(), base);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}
