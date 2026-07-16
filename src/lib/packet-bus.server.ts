// In-memory pub/sub bus for packet events on the Node server process.
// Backing store for /api/public/ingest -> /api/public/stream (SSE).
// This module MUST NOT be imported from client bundles. The `.server.ts`
// suffix triggers Lovable's import protection.

import type { PacketEvent } from "./packets";

type Subscriber = (evt: PacketEvent) => void;

// Use globalThis to survive HMR in dev.
const g = globalThis as unknown as {
  __netsentinel_subs?: Set<Subscriber>;
  __netsentinel_stats?: {
    totalPackets: number;
    totalBytes: number;
    startedAt: number;
    lastPacketAt: number | null;
    agentId: string | null;
  };
};

if (!g.__netsentinel_subs) g.__netsentinel_subs = new Set();
if (!g.__netsentinel_stats) {
  g.__netsentinel_stats = {
    totalPackets: 0,
    totalBytes: 0,
    startedAt: Date.now(),
    lastPacketAt: null,
    agentId: null,
  };
}

export function subscribe(cb: Subscriber) {
  g.__netsentinel_subs!.add(cb);
  return () => g.__netsentinel_subs!.delete(cb);
}

export function publish(evt: PacketEvent, agentId?: string) {
  const stats = g.__netsentinel_stats!;
  stats.totalPackets++;
  stats.totalBytes += evt.length;
  stats.lastPacketAt = Date.now();
  if (agentId) stats.agentId = agentId;
  for (const s of g.__netsentinel_subs!) {
    try {
      s(evt);
    } catch {
      /* ignore */
    }
  }
}

export function getStats() {
  return { ...g.__netsentinel_stats! };
}
