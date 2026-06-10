import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceKey) {
    return null;
  }

  // Node.js < 22 需要手动提供 ws 作为 WebSocket transport
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let websocketImpl: any = undefined;
  if (typeof WebSocket === "undefined") {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      websocketImpl = require("ws");
    } catch {
      // ws not available, skip
    }
  }

  return createSupabaseClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
    realtime: websocketImpl ? { transport: websocketImpl } : undefined,
  });
}

/** Alias used by API routes */
export function createClient() {
  return createServerClient();
}
