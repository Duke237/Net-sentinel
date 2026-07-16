import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

export const Route = createFileRoute("/api/public/stream")({
  server: {
    handlers: {
      GET: async () => {
        const { subscribe, getStats } = await import("@/lib/packet-bus.server");
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            const send = (event: string, data: unknown) => {
              try {
                controller.enqueue(
                  encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
                );
              } catch {
                /* closed */
              }
            };
            send("hello", { stats: getStats() });
            const unsub = subscribe((pkt) => send("packet", pkt));
            const ping = setInterval(() => {
              try {
                controller.enqueue(encoder.encode(`: ping\n\n`));
              } catch {
                clearInterval(ping);
                unsub();
              }
            }, 15_000);
          },
        });
        return new Response(stream, {
          headers: {
            "content-type": "text/event-stream",
            "cache-control": "no-cache, no-transform",
            connection: "keep-alive",
            "x-accel-buffering": "no",
          },
        });
      },
    },
  },
});
