import { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://check4dlive.vercel.app";
  const now = new Date();

  // 静态页面
  const staticPages: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${base}/analytics`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/draws`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/live`, lastModified: now, changeFrequency: "always", priority: 0.9 },
  ];

  // 全部 10000 个号码页
  const numberPages: MetadataRoute.Sitemap = [];
  for (let i = 0; i <= 9999; i++) {
    const num = String(i).padStart(4, "0");
    numberPages.push({
      url: `${base}/number/${num}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    });
  }

  return [...staticPages, ...numberPages];
}
