const LOGOS = [
  "nordstrom-rack",
  "levi",
  "guess",
  "pandora",
  "under-armour",
  "lacoste",
  "converse",
  "timberland",
  "oakley",
  "sunglass-hut",
  "the-container-store",
  "sur-la-table",
  "tommy-bahama",
  "brooks-brothers",
  "lindt",
  "nespresso",
  "dr-marten",
  "vera-bradley",
  "fabletics",
  "asics",
  "nautica",
  "kipling",
  "the-vitamin-shoppe",
  "tempur-pedic",
  "lovesac",
  "untuckit",
  "psycho-bunny",
  "7-for-all-mankind",
  "aeropostale",
  "buckle",
  "lucky-brand",
  "pearle-vision",
  "perfumania",
  "fragrance-outlet",
  "splendid",
  "stitch-it",
  "wirelesswave",
  "tbooth",
  "chatters",
  "ben-bridge",
  "daniels-jewelers",
  "caryl-baker-visage",
  "koko-black",
  "laubman-pank",
  "opsm",
  "the-cosmetics-company-store",
];

/**
 * The one ambient loop on the page: pure CSS, in a region with no reading
 * content, paused on hover, and static under prefers-reduced-motion.
 */
export function LogoMarquee() {
  const track = [...LOGOS, ...LOGOS];
  return (
    <section className="border-b border-line bg-bg-elev py-8" aria-label="Retailers using Engagement Agents">
      <p className="mb-5 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-fg-muted">Trusted by retailers across the US and Canada</p>
      <div className="marquee relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
        <ul className="marquee-track flex w-max items-center gap-12 px-6">
          {track.map((slug, i) => (
            <li key={`${slug}-${i}`} className="shrink-0" aria-hidden={i >= LOGOS.length}>
              <img src={`/ea/logos/${slug}.png`} alt={i < LOGOS.length ? slug.replace(/-/g, " ") : ""} className="h-7 w-auto opacity-70 grayscale transition-opacity hover:opacity-100 dark:invert" loading="lazy" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
