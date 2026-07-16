import { AlertTriangle } from "lucide-react";
import type { Alert } from "@/lib/packets";

const SEV_STYLES: Record<Alert["severity"], string> = {
  info: "bg-info/10 text-info",
  warning: "bg-warning/15 text-warning",
  critical: "bg-destructive/10 text-destructive",
};

export function AlertsPanel({ alerts }: { alerts: Alert[] }) {
  if (!alerts.length) {
    return (
      <div className="rounded-xl border bg-card p-4 text-xs text-muted-foreground">
        No anomalies detected yet. Heuristics scan for SYN sweeps, ARP anomalies, and high-entropy DNS.
      </div>
    );
  }
  return (
    <div className="scrollbar-thin max-h-72 space-y-2 overflow-y-auto">
      {alerts.map((a) => (
        <div key={a.id} className="rounded-lg border bg-card p-3 text-xs">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[10px] uppercase ${SEV_STYLES[a.severity]}`}>
              <AlertTriangle className="h-3 w-3" />
              {a.severity}
            </span>
            <span className="font-semibold">{a.kind}</span>
            <span className="ml-auto font-mono text-[10px] text-muted-foreground">
              {new Date(a.ts).toLocaleTimeString()}
            </span>
          </div>
          <p className="mt-1 leading-snug text-foreground/80">{a.message}</p>
        </div>
      ))}
    </div>
  );
}
