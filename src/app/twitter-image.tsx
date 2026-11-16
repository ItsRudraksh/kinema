import { ImageResponse } from "next/og";

export const alt = "KINEMA — Living Cinema Atlas & Screening Diary";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function TwitterImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "64px 72px",
        background:
          "radial-gradient(circle at 75% 45%, rgba(56,189,248,0.22), rgba(245,158,11,0.12) 32%, #06070a 72%)",
        color: "#f4f4f5",
        fontFamily: "Georgia, serif",
      }}
    >
      <div
        style={{
          fontFamily: "monospace",
          fontSize: "20px",
          letterSpacing: "0.24em",
          color: "#f59e0b",
        }}
      >
        KINEMA · CINEMA ATLAS
      </div>
      <div style={{ fontSize: "78px", lineHeight: 1.04, color: "#ffffff" }}>
        Your life in cinema, in orbit.
      </div>
      <div
        style={{
          fontFamily: "monospace",
          fontSize: "20px",
          color: "#38bdf8",
        }}
      >
        3D GLOBE · CONSTELLATIONS · SAGA ROADMAPS · OTT RADAR
      </div>
    </div>,
    size,
  );
}
