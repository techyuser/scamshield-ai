import type { MetadataRoute } from "next";

export const dynamic = "force-static";

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
