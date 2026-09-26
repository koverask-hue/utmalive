import { ImageResponse } from "next/og";

// The card Discord and other apps show when someone pastes the link.
export const alt = "8live";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", gap: 40, padding: "0 110px", background: "#07080D", color: "#F2EFE8" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ width: 150, height: 150, borderRadius: 999, border: "30px solid #F2EFE8" }} />
          <div style={{ width: 190, height: 190, borderRadius: 999, background: "#FF3B4E", marginTop: -4 }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 230, fontWeight: 600, letterSpacing: -8, lineHeight: 0.9 }}>live</div>
          <div style={{ fontSize: 40, color: "#9A98A6" }}>Streams for members of the 8live Discord</div>
        </div>
      </div>
    ),
    size,
  );
}
