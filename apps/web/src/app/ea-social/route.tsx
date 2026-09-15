import { ImageResponse } from "next/og";

export const dynamic = "force-static";

/** Homepage-specific share card; the application keeps its Field Agent card. */
export function GET() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "65px 75px",
        background: "#f3fafc",
        color: "#341b41",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ color: "#1689b3", fontSize: 32, fontWeight: 700 }}>engagement agents</div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          fontSize: 65,
          lineHeight: 1.1,
          letterSpacing: -3,
          fontWeight: 700,
        }}
      >
        <span>Get more from the retail</span>
        <span>marketing you</span>
        <span style={{ color: "#166f90" }}>already pay for.</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 23 }}>
        <div style={{ width: 12, height: 12, background: "#42c3f1", transform: "rotate(45deg)" }} />{" "}
        Your campaigns. Your shopping centers. Connected.
      </div>
    </div>,
    { width: 1200, height: 630 },
  );
}
