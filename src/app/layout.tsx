import type { Metadata, Viewport } from "next";
import {
  Instrument_Sans,
  Instrument_Serif,
  Space_Mono,
} from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

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
  title: "Kinema — Living Cinema Atlas & Film Diary",
  description:
    "Interactive 3D poster cosmos and multi-media screening journal for films, series, anime & dramas.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#06070a" },
    { media: "(prefers-color-scheme: light)", color: "#06070a" },
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
        <div className="root">{children}</div>
        <Toaster theme="dark" richColors position="bottom-right" />
      </body>
    </html>
  );
}
