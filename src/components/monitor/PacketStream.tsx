import { useState } from "react";
import { PROTOCOL_COLOR, type PacketEvent } from "@/lib/packets";

export function PacketStream({
  packets,
  filter,
}: {
  packets: PacketEvent[];
  filter: Set<string>;
}) {
  const [selected, setSelected] = useState<PacketEvent | null>(null);
  const shown = filter.size ? packets.filter((p) => filter.has(p.protocol)) : packets;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="grid grid-cols-[70px_84px_minmax(120px,1fr)_minmax(120px,1fr)_70px_60px_minmax(160px,2fr)] gap-2 border-b bg-muted/50 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>Time</span>
        <span>Proto</span>
        <span>Source</span>
        <span>Dest</span>
        <span className="text-right">Len</span>
        <span>Flags</span>
        <span>Info</span>
      </div>
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto font-mono text-xs">
        {shown.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            <span className="animate-pulse">Waiting for packets…</span>
          </div>
        ) : (
          shown.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelected(p)}
              className={`grid w-full grid-cols-[70px_84px_minmax(120px,1fr)_minmax(120px,1fr)_70px_60px_minmax(160px,2fr)] gap-2 border-b border-border/50 px-3 py-1.5 text-left hover:bg-accent/40 ${
                selected?.id === p.id ? "bg-accent/60" : ""
              }`}
            >
              <span className="text-muted-foreground">
                {new Date(p.ts).toLocaleTimeString([], { hour12: false })}
              </span>
              <span className={`font-semibold ${PROTOCOL_COLOR[p.protocol] || ""}`}>{p.protocol}</span>
              <span className="truncate">
                {p.src}
                {p.srcPort ? `:${p.srcPort}` : ""}
              </span>
              <span className="truncate">
                {p.dst}
                {p.dstPort ? `:${p.dstPort}` : ""}
              </span>
              <span className="text-right tabular-nums text-muted-foreground">{p.length}</span>
              <span className="truncate text-muted-foreground">{p.flags || "—"}</span>
              <span className="truncate text-foreground/80">{p.info}</span>
            </button>
          ))
        )}
      </div>
      {selected && (
        <div className="border-t bg-muted/40 p-3 font-mono text-xs">
          <div className="mb-1 flex items-center justify-between">
            <span className="font-semibold">Packet {selected.id}</span>
            <button
              onClick={() => setSelected(null)}
              className="text-[10px] uppercase text-muted-foreground hover:text-foreground"
            >
              close
            </button>
          </div>
          <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-all text-[11px] leading-relaxed text-foreground/80">
{JSON.stringify(selected, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
