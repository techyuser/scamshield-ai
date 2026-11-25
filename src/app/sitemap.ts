import type { MetadataRoute } from "next";

/**
 * Generates XML sitemap entries for the application.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://scamshield-ai.netlify.app",
      lastModified: new Date("2026-11-25T18:00:00Z"),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
