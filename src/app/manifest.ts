import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cynthia's Wedding Plans",
    short_name: "Cynthia's Plans",
    description: "Cynthia's wedding plans, made by Kane: the checklist, the budget, the countdown and the RSVPs.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f1eb",
    theme_color: "#f5f1eb",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
