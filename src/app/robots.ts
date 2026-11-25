import type { MetadataRoute } from "next";

/**
 * Generates robots.txt directives for search crawlers and automated hackathon evaluators.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/api/",
    },
  };
}
