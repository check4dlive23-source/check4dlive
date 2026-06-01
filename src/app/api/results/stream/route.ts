import { getRefreshIntervalMs } from "@/lib/draw-time";
import { getRegionResults } from "@/lib/live-results";
import type { Region } from "@/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const region = (searchParams.get("region") || "west") as Region;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let intervalMs = 60_000;
      let timer: ReturnType<typeof setInterval> | null = null;

      const send = (event: string, payload: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`)
        );
      };

      const poll = async () => {
        try {
          const payload = await getRegionResults(region);
          intervalMs = getRefreshIntervalMs(payload.isLive);
          send("results", {
            operators: payload.operators,
            isLive: payload.isLive,
            date: payload.date,
            region: payload.region,
            source: payload.source,
          });
          if (timer) clearInterval(timer);
          timer = setInterval(poll, intervalMs);
        } catch (e) {
          send("error", {
            message: e instanceof Error ? e.message : "poll failed",
          });
        }
      };

      await poll();

      request.signal.addEventListener("abort", () => {
        if (timer) clearInterval(timer);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
