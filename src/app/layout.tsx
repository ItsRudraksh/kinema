import type { Metadata, Viewport } from "next";
import {
  Instrument_Sans,
  Instrument_Serif,
  Space_Mono,
} from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";
import { PwaManager } from "@/components/PwaManager";
import "./globals.css";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://kinema-atlas.vercel.app";

const instrumentSerif = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-instrument-serif",
});

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument-sans",
});

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-space-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "KINEMA — Living Cinema Atlas & Screening Diary",
    template: "%s · KINEMA",
  },
  description:
    "An interactive 3D WebGL cinema globe and personal screening diary for films, web series, anime, and dramas — featuring holographic core exploration, actor constellations, saga roadmaps, spin-the-globe randomizers, and live OTT release radar.",
  applicationName: "KINEMA",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "KINEMA",
    title: "KINEMA — Your Life in Cinema, in Orbit",
    description:
      "Spin a curved 3D movie cosmos, step inside a holographic film universe, map actor constellations, and log films, series, anime & dramas.",
    images: [{ url: "/brand/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "KINEMA — Living Cinema Atlas & Screening Diary",
    images: ["/brand/og-image.png"],
  },
  appleWebApp: {
    capable: true,
    title: "KINEMA",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-48x48.png", sizes: "48x48", type: "image/png" },
      { url: "/icons/icon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: [{ url: "/favicon.ico" }],
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#010206" },
    { media: "(prefers-color-scheme: light)", color: "#010206" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${instrumentSerif.variable} ${instrumentSans.variable} ${spaceMono.variable}`}
    >
      <body>
        <ClerkProvider>
          <div className="root">{children}</div>
          <PwaManager />
          <Toaster theme="dark" richColors position="bottom-right" />
        </ClerkProvider>
      </body>
    </html>
  );
}
