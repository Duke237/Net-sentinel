import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

export const Route = createFileRoute("/api/public/ingest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { publish } = await import("@/lib/packet-bus.server");
          const body = (await request.json()) as {
            agentId?: string;
            events?: unknown;
          };
          const events = Array.isArray(body.events) ? body.events : [];
          let accepted = 0;
          for (const raw of events) {
            const e = raw as Record<string, unknown>;
            if (typeof e?.src !== "string" || typeof e?.dst !== "string" || typeof e?.protocol !== "string") {
              continue;
            }
            publish(
              {
                id: String(e.id ?? `ing_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`),
                ts: typeof e.ts === "number" ? e.ts : Date.now(),
                src: e.src,
                dst: e.dst,
                srcPort: typeof e.srcPort === "number" ? e.srcPort : undefined,
                dstPort: typeof e.dstPort === "number" ? e.dstPort : undefined,
                protocol: e.protocol as never,
                length: typeof e.length === "number" ? e.length : 0,
                flags: typeof e.flags === "string" ? e.flags : undefined,
                info: typeof e.info === "string" ? e.info : undefined,
              },
              typeof body.agentId === "string" ? body.agentId : undefined,
            );
            accepted++;
          }
          return new Response(JSON.stringify({ ok: true, accepted }), {
            headers: { "content-type": "application/json" },
          });
        } catch (err) {
          return new Response(
            JSON.stringify({ ok: false, error: err instanceof Error ? err.message : "invalid" }),
            { status: 400, headers: { "content-type": "application/json" } },
          );
        }
      },
      GET: async () => new Response(JSON.stringify({ ok: true, hint: "POST packet events here" }), {
        headers: { "content-type": "application/json" },
      }),
    },
  },
});
