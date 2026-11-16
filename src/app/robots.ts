import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://kinema-atlas.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: [
          "Googlebot",
          "Bingbot",
          "OAI-SearchBot",
          "ChatGPT-User",
          "Claude-SearchBot",
          "PerplexityBot",
          "Applebot",
        ],
        allow: ["/", "/llms.txt"],
        disallow: ["/api/"],
      },
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
