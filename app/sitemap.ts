import type { MetadataRoute } from "next";

const origin = "https://tachocommand.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${origin}/`,
      lastModified: new Date("2026-09-18"),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${origin}/privacy`,
      lastModified: new Date("2026-09-18"),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${origin}/terms`,
      lastModified: new Date("2026-09-18"),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${origin}/impressum`,
      lastModified: new Date("2026-09-18"),
      changeFrequency: "monthly",
      priority: 0.2,
    },
  ];
}
