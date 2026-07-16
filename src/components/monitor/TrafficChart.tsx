import { useEffect, useRef } from "react";
import type { PacketEvent } from "@/lib/packets";

// Rolling packet-rate sparkline computed from packet timestamps.
export function TrafficChart({ packets, height = 140 }: { packets: PacketEvent[]; height?: number }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const bucketsRef = useRef<{ ts: number; count: number; bytes: number }[]>([]);

  useEffect(() => {
    const now = Date.now();
    const bucketMs = 1000;
    const windowMs = 60_000;
    const start = now - windowMs;
    // rebuild buckets from packets in window
    const buckets = new Map<number, { count: number; bytes: number }>();
    for (const p of packets) {
      if (p.ts < start) continue;
      const key = Math.floor(p.ts / bucketMs) * bucketMs;
      const b = buckets.get(key) || { count: 0, bytes: 0 };
      b.count++;
      b.bytes += p.length;
      buckets.set(key, b);
    }
    const arr: { ts: number; count: number; bytes: number }[] = [];
    for (let t = Math.floor(start / bucketMs) * bucketMs; t <= now; t += bucketMs) {
      const b = buckets.get(t) || { count: 0, bytes: 0 };
      arr.push({ ts: t, ...b });
    }
    bucketsRef.current = arr;

    const svg = svgRef.current;
    if (!svg) return;
    const W = svg.clientWidth || 600;
    const H = height;
    const pad = { l: 8, r: 8, t: 8, b: 18 };
    const iw = W - pad.l - pad.r;
    const ih = H - pad.t - pad.b;
    const max = Math.max(1, ...arr.map((b) => b.count));
    const step = iw / Math.max(1, arr.length - 1);

    const path = arr
      .map((b, i) => {
        const x = pad.l + i * step;
        const y = pad.t + ih - (b.count / max) * ih;
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

    const area = `${path} L${(pad.l + (arr.length - 1) * step).toFixed(1)},${(pad.t + ih).toFixed(1)} L${pad.l.toFixed(1)},${(pad.t + ih).toFixed(1)} Z`;

    // bars for byte volume
    const barsMax = Math.max(1, ...arr.map((b) => b.bytes));
    const bars = arr
      .map((b, i) => {
        const x = pad.l + i * step - 1;
        const bh = (b.bytes / barsMax) * ih * 0.9;
        const y = pad.t + ih - bh;
        return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="2" height="${bh.toFixed(1)}" fill="currentColor" opacity="0.15" />`;
      })
      .join("");

    svg.innerHTML = `
      <defs>
        <linearGradient id="area-grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="currentColor" stop-opacity="0.28"/>
          <stop offset="100%" stop-color="currentColor" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <g class="text-foreground">${bars}</g>
      <path d="${area}" fill="url(#area-grad)" class="text-primary" />
      <path d="${path}" fill="none" stroke="currentColor" stroke-width="1.75" class="text-primary" />
    `;
  }, [packets, height]);

  return (
    <div className="w-full" style={{ height }}>
      <svg ref={svgRef} className="h-full w-full" preserveAspectRatio="none" />
    </div>
  );
}
