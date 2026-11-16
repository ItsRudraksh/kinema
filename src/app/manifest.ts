import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "KINEMA — Living Cinema Atlas & Screening Diary",
    short_name: "KINEMA",
    description:
      "Interactive 3D poster cosmos, actor constellations, OTT radar, and screening journal for films, series, anime & dramas.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#06070a",
    theme_color: "#06070a",
    categories: ["entertainment", "lifestyle", "utilities"],
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Search Cosmos",
        short_name: "Search",
        description: "Search films, series, anime, actors & directors",
        url: "/?action=search",
      },
      {
        name: "Spin the Globe",
        short_name: "Spin",
        description: "Pick a random unwatched title from your globe",
        url: "/?action=spin",
      },
    ],
  };
}
