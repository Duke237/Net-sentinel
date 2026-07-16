import { useEffect, useState } from "react";

export function BootSequence({ onDone }: { onDone: () => void }) {
  const [lines, setLines] = useState<string[]>([]);
  useEffect(() => {
    const seq = [
      "[  ok  ] initializing netsentinel console v1.0.0",
      "[  ok  ] mounting operator workspace",
      "[  ok  ] loading protocol decoders (TCP/UDP/HTTP/DNS/TLS/ICMP/ARP)",
      "[  ok  ] priming anomaly heuristics (SYN sweep · ARP · DNS entropy)",
      "[  ok  ] opening live packet channel",
      "[ ready ] welcome, operator",
    ];
    let i = 0;
    const t = setInterval(() => {
      setLines((prev) => [...prev, seq[i]]);
      i++;
      if (i >= seq.length) {
        clearInterval(t);
        setTimeout(onDone, 400);
      }
    }, 220);
    return () => clearInterval(t);
  }, [onDone]);
  return (
    <div className="terminal-panel fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="mb-2 flex items-center gap-2 text-xs opacity-70">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <span className="ml-2">netsentinel — secure boot</span>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-black/40 p-5 text-sm leading-relaxed">
          {lines.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
          <div className="mt-1">
            <span className="animate-pulse">▊</span>
          </div>
        </div>
      </div>
    </div>
  );
}
