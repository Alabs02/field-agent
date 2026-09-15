import { ImageResponse } from "next/og";

export const alt = "Field Agent by Engagement Agents: promotions scraped, verified, and served";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const EA_PATHS = [
  "M214.4,449.6C90.4,449.6,0,363.2,0,224.8S88.8,0,214.4,0s206.4,91.2,206.4,202.4c0,17.6,0,28.8-1.6,44H56.8c4.8,102.4,76,156,157.6,156,74.4,0,124.8-39.2,140.8-97.6h59.2c-20,82.4-90.4,144.8-200,144.8ZM56.8,200.8h307.2c2.4-101.6-71.2-152.8-152-152.8S63.2,99.2,56.8,200.8Z",
  "M706.4,0c88,0,148,47.2,172.8,102.4V6.4h56v436.8h-56v-96.8c-25.6,56-86.4,103.2-173.6,103.2-119.2,0-208-88.8-208-225.6S586.4,0,706.4,0ZM716.8,48.8c-92,0-162.4,64-162.4,175.2s70.4,176.8,162.4,176.8,162.4-67.2,162.4-176-72.8-176-162.4-176Z",
];

/** Brand card for link previews: the ea mark on the sky, the product name in ink. */
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "linear-gradient(135deg, #f0fbfe 0%, #ffffff 45%, #fde3ec 100%)",
          color: "#150a1b",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <div style={{ display: "flex", width: 112, height: 112, borderRadius: 26, background: "#42c3f1", alignItems: "center", justifyContent: "center" }}>
            <svg width="80" height="38" viewBox="0 0 935.2 449.6" fill="#150a1b">
              {EA_PATHS.map((d) => (
                <path key={d.slice(0, 12)} d={d} />
              ))}
            </svg>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 30, color: "#5e544b" }}>by Engagement Agents</div>
            <div style={{ fontSize: 72, fontWeight: 700, letterSpacing: -2, lineHeight: 1 }}>Field Agent</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: -1, lineHeight: 1.15, maxWidth: 980 }}>Every promotion at the center, with the evidence to prove it.</div>
          <div style={{ fontSize: 28, color: "#5e544b" }}>Scraped politely, verified against the source, served with an audit trail.</div>
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 10, background: "linear-gradient(90deg, #42c3f1, #e23d6f, #6b4a7e)" }} />
      </div>
    ),
    size,
  );
}
