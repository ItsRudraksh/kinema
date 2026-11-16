import type { Metadata, Viewport } from "next";
import {
  Instrument_Sans,
  Instrument_Serif,
  Space_Mono,
} from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://kinema-atlas.vercel.app";

const BRAND_BG = "#010206";

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
    default: "KINEMA — Living Cinema Atlas & Film Diary",
    template: "%s · KINEMA",
  },

  description:
    "An interactive 3D cinema atlas and personal screening diary for films, web series, anime, and dramas.",

  applicationName: "KINEMA",

  keywords: [
    "KINEMA",
    "movie diary",
    "film journal",
    "cinema atlas",
    "3D movie globe",
    "anime tracker",
    "web series tracker",
    "K-drama tracker",
    "OTT watchlist",
    "TMDB movie app",
  ],

  authors: [{ name: "KINEMA" }],
  creator: "KINEMA",

  alternates: {
    canonical: "/",
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
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

  openGraph: {
    type: "website",
    url: "/",
    siteName: "KINEMA",
    title: "KINEMA — Your Life in Cinema, in Orbit",
    description:
      "Explore an interactive 3D cinema cosmos, actor constellations, saga roadmaps, OTT radar, and your personal screening diary.",
    locale: "en_US",
  },

  twitter: {
    card: "summary_large_image",
    title: "KINEMA — Living Cinema Atlas & Film Diary",
    description:
      "Interactive 3D cinema globe, actor constellations, OTT radar and personal film journal.",
  },

  appleWebApp: {
    capable: true,
    title: "KINEMA",
    statusBarStyle: "black-translucent",
  },

  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: BRAND_BG },
    { media: "(prefers-color-scheme: light)", color: BRAND_BG },
  ],
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "KINEMA",
  alternateName: "KINEMA Cinema Atlas",
  url: SITE_URL,
  applicationCategory: "EntertainmentApplication",
  operatingSystem: "Any",
  browserRequirements: "Requires WebGL2 and a modern browser",
  description:
    "Interactive 3D cinema atlas and personal screening diary for films, TV series, anime, and dramas.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
          }}
        />

        <div className="root">{children}</div>

        <Toaster theme="dark" richColors position="bottom-right" />
      </body>
    </html>
  );
}
