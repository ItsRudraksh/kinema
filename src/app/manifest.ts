import type { MetadataRoute } from "next";

// Brand surface colour sampled from the logo art (#010206) so the splash
// screen and title bar blend seamlessly with the mark.
const BRAND_BG = "#010206";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Kinema",
    short_name: "Kinema",
    // TODO: tweak to your own tagline
    description: "Kinema â€” interactive 3D cinema atlas and screening diary for films, series, anime & dramas.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "any",
    background_color: BRAND_BG,
    theme_color: BRAND_BG,
    categories: ["entertainment", "movies", "lifestyle"],
    shortcuts: [
      {
        name: "Search Titles & Constellations",
        short_name: "Search",
        description: "Search films, series, anime, actors & directors",
        url: "/?action=search",
      },
      {
        name: "Spin the Globe",
        short_name: "Spin",
        description: "Pick an unwatched title from the 3D globe",
        url: "/?action=spin",
      },
    ],    icons: [
      // purpose: any â€“ rounded tile, used on desktop / install dialogs / tabs
      { src: "/icons/icon-48x48.png", sizes: "48x48", type: "image/png", purpose: "any" },
      { src: "/icons/icon-72x72.png", sizes: "72x72", type: "image/png", purpose: "any" },
      { src: "/icons/icon-96x96.png", sizes: "96x96", type: "image/png", purpose: "any" },
      { src: "/icons/icon-128x128.png", sizes: "128x128", type: "image/png", purpose: "any" },
      { src: "/icons/icon-144x144.png", sizes: "144x144", type: "image/png", purpose: "any" },
      { src: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png", purpose: "any" },
      { src: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-256x256.png", sizes: "256x256", type: "image/png", purpose: "any" },
      { src: "/icons/icon-384x384.png", sizes: "384x384", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // purpose: maskable â€“ full-bleed, mark kept inside the 80% safe zone (Android adaptive icons)
      { src: "/icons/icon-maskable-192x192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-maskable-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      // purpose: monochrome â€“ Android 13+ themed icons
      { src: "/icons/icon-monochrome-512x512.png", sizes: "512x512", type: "image/png", purpose: "monochrome" },
    ],
  };
}

