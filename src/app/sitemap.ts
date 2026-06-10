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
    { url: `${base}/operator/magnum`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/operator/damacai`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/operator/toto`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/operator/sabah88`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/operator/stc`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/operator/cashsweep`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/operator/singapore`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
  ];

  // 所有开彩记录页
  const drawPages: MetadataRoute.Sitemap = [];
  try {
    const supabase = createClient();
    if (supabase) {
      const PAGE_SIZE = 1000;
      let page = 0;
      let hasMore = true;
      while (hasMore) {
        const { data: batch, error } = await supabase
          .from("draw_results_v2")
          .select("draw_date, operator, created_at")
          .order("draw_date", { ascending: false })
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
        if (error || !batch || batch.length === 0) {
          hasMore = false;
        } else {
          for (const row of batch) {
            drawPages.push({
              url: `${base}/draw/${row.draw_date}-${row.operator}`,
              lastModified: row.created_at ? new Date(row.created_at as string) : now,
              changeFrequency: "monthly",
              priority: 0.7,
            });
          }
          hasMore = batch.length === PAGE_SIZE;
          page++;
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
