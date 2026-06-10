import { createBrowserClient as createSSRBrowserClient } from "@supabase/ssr";

/**
 * 带 session 的浏览器 client(登录按钮、客户端组件用)。
 * 与 client.ts 的旧 createBrowserClient 区分:这个会读写 auth cookie。
 */
export function createAuthBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return createSSRBrowserClient(url, anonKey);
}
