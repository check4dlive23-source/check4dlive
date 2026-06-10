import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * 只做一件事:刷新过期的 auth token 并同步 cookie。
 * 不做路由拦截,所有页面公开可访问(登录墙在页面层自行处理)。
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // 触发 token 刷新(结果不用,副作用是写回新 cookie)
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    /*
     * 排除静态资源、图片、API admin 路由、SSE 流:
     * 只在页面请求上跑,避免拖慢 /api/results/stream 等高频端点
     */
    "/((?!_next/static|_next/image|favicon.ico|logos/|api/admin|api/results/stream|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
