import { Terminal } from "lucide-react";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <Terminal className="h-4 w-4" />
      </span>
      <div className="flex flex-col leading-tight">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Console
        </span>
        <span className="text-sm font-semibold tracking-tight">NetSentinel</span>
      </div>
    </div>
  );
}
