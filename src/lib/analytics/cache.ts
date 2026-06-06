import { createBrowserClient } from "@/lib/supabase/client";
import { createServerClient } from "@/lib/supabase/server";

export async function readCache(type: string): Promise<unknown | null> {
  const supabase = createBrowserClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("analytics_cache")
    .select("payload")
    .eq("type", type)
    .maybeSingle();

  if (error || !data) return null;
  return data.payload ?? null;
}

export async function writeCache(type: string, payload: unknown): Promise<void> {
  const supabase = createServerClient();
  if (!supabase) {
    console.error(`writeCache(${type}): Supabase client unavailable`);
    return;
  }

  const { error } = await supabase.from("analytics_cache").upsert(
    {
      type,
      payload,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "type" }
  );

  if (error) {
    console.error(`writeCache(${type}):`, error.message);
  }
}
