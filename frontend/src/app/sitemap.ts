import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://dns-shield.security";
  const lastModified = new Date();

  const routes = [
    { url: `${baseUrl}`, priority: 1.0, changeFrequency: "daily" as const },
    { url: `${baseUrl}/login`, priority: 0.8, changeFrequency: "monthly" as const },
    { url: `${baseUrl}/app/dashboard`, priority: 0.95, changeFrequency: "always" as const },
    { url: `${baseUrl}/app/forecast`, priority: 0.95, changeFrequency: "always" as const },
    { url: `${baseUrl}/app/threats`, priority: 0.9, changeFrequency: "always" as const },
    { url: `${baseUrl}/app/pipeline`, priority: 0.85, changeFrequency: "hourly" as const },
    { url: `${baseUrl}/app/xai`, priority: 0.85, changeFrequency: "daily" as const },
    { url: `${baseUrl}/app/models`, priority: 0.8, changeFrequency: "weekly" as const },
    { url: `${baseUrl}/app/devices`, priority: 0.8, changeFrequency: "hourly" as const },
    { url: `${baseUrl}/app/quarantine`, priority: 0.8, changeFrequency: "hourly" as const },
    { url: `${baseUrl}/app/analytics`, priority: 0.8, changeFrequency: "daily" as const },
    { url: `${baseUrl}/app/reports`, priority: 0.75, changeFrequency: "daily" as const },
    { url: `${baseUrl}/app/settings`, priority: 0.7, changeFrequency: "monthly" as const },
  ];

  return routes.map((r) => ({
    url: r.url,
    lastModified,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
