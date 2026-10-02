import type { MetadataRoute } from "next";

// The guest list is for Cynthia only; keep it (and the API) out of search engines.
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/rsvp/list", "/api/"] }] };
}
