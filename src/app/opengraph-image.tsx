import { ImageResponse } from "next/og";

export const alt = "KINEMA — Living Cinema Atlas & Screening Diary";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
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
          display: "flex",
          alignItems: "center",
          gap: "16px",
          fontFamily: "monospace",
          fontSize: "20px",
          letterSpacing: "0.24em",
          color: "#f59e0b",
        }}
      >
        <div
          style={{
            width: "18px",
            height: "18px",
            borderRadius: "9999px",
            background: "#f59e0b",
          }}
        />
        <span>KINEMA · CINEMA ATLAS</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        <div
          style={{
            fontSize: "78px",
            lineHeight: 1.04,
            letterSpacing: "-0.02em",
            color: "#ffffff",
          }}
        >
          Your life in cinema, in orbit.
        </div>
        <div
          style={{
            fontFamily: "sans-serif",
            fontSize: "28px",
            color: "#a1a1aa",
            maxWidth: "820px",
          }}
        >
          Interactive 3D poster sphere, actor constellations, saga roadmaps, OTT
          radar & personal diary for films, series, anime and dramas.
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontFamily: "monospace",
          fontSize: "18px",
          color: "#38bdf8",
        }}
      >
        <span>FILMS · SERIES · ANIME · DRAMAS</span>
        <span>24FPS ARCHIVE</span>
      </div>
    </div>,
    size,
  );
}
