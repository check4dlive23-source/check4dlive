import { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://check4dterminal.com";
  const now = new Date();

  // 静态页面
  const staticPages: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${base}/draws`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/rankings`, lastModified: now, changeFrequency: "daily", priority: 0.85 },
    { url: `${base}/live`, lastModified: now, changeFrequency: "always", priority: 0.9 },
  ];

  // 所有开彩记录页
  const drawPages: MetadataRoute.Sitemap = [];
  try {
    const supabase = createClient();
    if (supabase) {
      const { data } = await supabase
        .from("draw_results_v2")
        .select("draw_date, operator, updated_at")
        .order("draw_date", { ascending: false });

      if (data) {
        for (const row of data) {
          drawPages.push({
            url: `${base}/draw/${row.draw_date as string}-${row.operator as string}`,
            lastModified: row.updated_at ? new Date(row.updated_at as string) : now,
            changeFrequency: "monthly",
            priority: 0.7,
          });
        }
      }
    }
  } catch (e) {
    console.error("Sitemap drawPages error:", e);
  }

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

  return [...staticPages, ...drawPages, ...numberPages];
}
