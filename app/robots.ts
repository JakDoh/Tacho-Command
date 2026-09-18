import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/app", "/field-test", "/api/"],
    },
    sitemap: "https://tachocommand.com/sitemap.xml",
    host: "https://tachocommand.com",
  };
}
