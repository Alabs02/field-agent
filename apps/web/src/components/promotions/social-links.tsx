import type { SocialLink } from "@field-agent/shared";

const LABEL: Record<SocialLink["platform"], string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  x: "X",
  youtube: "YouTube",
  pinterest: "Pinterest",
  linkedin: "LinkedIn",
  threads: "Threads",
  snapchat: "Snapchat",
  other: "Link",
};

/**
 * Honest empty state: this portal lists no per-brand social accounts, and
 * inventing them would be worse than saying so.
 */
export function SocialLinks({ links, fetched }: { links: SocialLink[]; fetched: boolean }) {
  if (links.length === 0) {
    return <p className="text-xs italic text-fg-subtle">{fetched ? "Socials not listed on portal" : "Socials not fetched yet"}</p>;
  }
  return (
    <ul className="flex flex-wrap gap-1.5">
      {links.map((l) => (
        <li key={l.url}>
          <a
            href={l.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-full border border-line-strong px-2.5 py-0.5 text-xs hover:border-accent hover:text-accent"
          >
            {LABEL[l.platform]}
          </a>
        </li>
      ))}
    </ul>
  );
}
