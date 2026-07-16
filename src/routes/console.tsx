import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ChevronRight,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Menu,
  Pause,
  Play,
  Radio,
  RefreshCcw,
  ShieldAlert,
  Terminal,
  Wifi,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { logout } from "@/lib/auth";
import { useCapture } from "@/hooks/use-capture";
import { ALL_PROTOCOLS, PROTOCOL_COLOR, type Protocol } from "@/lib/packets";
import { PacketStream } from "@/components/monitor/PacketStream";
import { TrafficChart } from "@/components/monitor/TrafficChart";
import { AlertsPanel } from "@/components/monitor/AlertsPanel";
import { BootSequence } from "@/components/monitor/BootSequence";

export const Route = createFileRoute("/console")({
  head: () => ({
    meta: [
      { title: "Console · NetSentinel" },
      { name: "description", content: "Live network traffic monitoring console." },
    ],
  }),
  component: ConsolePage,
});

type Tab = "overview" | "packets" | "alerts" | "agent";

function ConsolePage() {
  const navigate = useNavigate();
  const { user, ready } = useAuth();
  const [booted, setBooted] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filter, setFilter] = useState<Set<Protocol>>(new Set());
  const [tab, setTab] = useState<Tab>("overview");
  const cap = useCapture();

  useEffect(() => {
    if (ready && !user) navigate({ to: "/auth" });
  }, [ready, user, navigate]);

  const toggleProto = (p: Protocol) =>
    setFilter((prev) => {
      const n = new Set(prev);
      if (n.has(p)) n.delete(p);
      else n.add(p);
      return n;
    });

  const protoCounts = useMemo(() => {
    const map = new Map<Protocol, number>();
    for (const p of cap.packets) map.set(p.protocol, (map.get(p.protocol) || 0) + 1);
    return map;
  }, [cap.packets]);

  const uptime = cap.startedAt ? Math.floor((Date.now() - cap.startedAt) / 1000) : 0;

  if (!ready || !user) return null;

  return (
    <div className="min-h-screen bg-background">
      {!booted && <BootSequence onDone={() => setBooted(true)} />}

      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/95 px-4 py-2 backdrop-blur lg:hidden">
        <button
          onClick={() => setSidebarOpen(true)}
          className="grid h-9 w-9 place-items-center rounded-lg border"
          aria-label="Open menu"
        >
          <Menu className="h-4 w-4" />
        </button>
        <div className="inline-flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground">
            <Terminal className="h-3.5 w-3.5" />
          </span>
          <span className="text-sm font-semibold">NetSentinel</span>
        </div>
        <img
          src={user.avatarUrl}
          alt=""
          className="h-8 w-8 rounded-full object-cover"
          referrerPolicy="no-referrer"
        />
      </div>

      <div className="mx-auto flex max-w-[1500px] gap-4 p-3 sm:p-4 lg:p-6">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 transform flex-col border-r bg-card p-4 transition-transform lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)] lg:translate-x-0 lg:rounded-2xl lg:border ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
                <Terminal className="h-4 w-4" />
              </span>
              <div className="leading-tight">
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Console
                </div>
                <div className="text-sm font-semibold">NetSentinel</div>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="grid h-8 w-8 place-items-center rounded-md hover:bg-accent lg:hidden"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 min-h-0 flex-1 space-y-6 overflow-y-auto pr-1">
            <nav className="space-y-1 text-sm">
              <div className="mb-1 px-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Main
              </div>
              {([
                { id: "overview", label: "Overview", icon: LayoutDashboard, badge: undefined as number | undefined },
                { id: "packets", label: "Packets", icon: Activity, badge: undefined as number | undefined },
                { id: "alerts", label: "Alerts", icon: ShieldAlert, badge: cap.alerts.length || undefined },
                { id: "agent", label: "Agent", icon: Wifi, badge: undefined as number | undefined },
              ] as const).map((item) => {
                const active = tab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setTab(item.id);
                      setSidebarOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left ${
                      active ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge ? (
                      <span className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] ${active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-destructive/20 text-destructive"}`}>
                        {item.badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </nav>

            <div>
              <div className="mb-2 px-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Protocol filter
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {ALL_PROTOCOLS.map((p) => {
                  const on = filter.has(p);
                  return (
                    <button
                      key={p}
                      onClick={() => toggleProto(p)}
                      className={`flex items-center justify-between rounded-md border px-2 py-1 font-mono text-[11px] ${
                        on ? "bg-primary text-primary-foreground" : "bg-background hover:bg-accent"
                      }`}
                    >
                      <span className={on ? "" : PROTOCOL_COLOR[p]}>{p}</span>
                      <span className="opacity-60">{protoCounts.get(p) || 0}</span>
                    </button>
                  );
                })}
              </div>
              {filter.size > 0 && (
                <button
                  onClick={() => setFilter(new Set())}
                  className="mt-2 w-full text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
                >
                  clear filters
                </button>
              )}
            </div>

            <div className="rounded-lg border-2 border-primary/40 bg-background p-3 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Capture mode
                </div>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest ${
                    cap.mode === "real"
                      ? "bg-success/15 text-success"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      cap.mode === "real" ? "bg-success animate-pulse" : "bg-muted-foreground"
                    }`}
                  />
                  {cap.mode}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1 rounded-md bg-muted p-1 text-xs">
                <button
                  onClick={() => cap.setMode("demo")}
                  className={`rounded px-2 py-1.5 font-semibold transition ${
                    cap.mode === "demo"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Demo
                </button>
                <button
                  onClick={() => cap.setMode("real")}
                  className={`inline-flex items-center justify-center gap-1 rounded px-2 py-1.5 font-semibold transition ${
                    cap.mode === "real"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Radio className="h-3 w-3" /> Real
                </button>
              </div>
              <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
                {cap.mode === "demo"
                  ? "Synthesized traffic for exploring the console. Switch to Real to stream live packets from the capture agent."
                  : "Live mode active. Run the Python agent on your host — instructions appear in the main panel."}
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-xl border bg-background p-2">
            <img
              src={user.avatarUrl}
              alt=""
              className="h-9 w-9 rounded-lg object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-sm font-semibold">{user.name}</div>
              <div className="truncate text-[11px] text-muted-foreground">{user.email}</div>
            </div>
            <button
              onClick={() => {
                logout();
                navigate({ to: "/" });
              }}
              className="grid h-8 w-8 place-items-center rounded-md hover:bg-accent"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </aside>

        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main */}
        <main className="min-w-0 flex-1 space-y-4">
          {/* Header + KPIs */}
          <section className="rounded-2xl border bg-card p-4 sm:p-6">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  <Link to="/" className="hover:text-foreground">Dashboard</Link>
                  <ChevronRight className="mx-1 inline h-3 w-3" />
                  <span className="capitalize">{tab}</span>
                </div>
                <h1 className="mt-1 truncate text-xl font-semibold sm:text-2xl">
                  Welcome back, {user.name}
                </h1>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <StatusPill status={cap.status} mode={cap.mode} />
                <button
                  onClick={() => cap.setPaused(!cap.paused)}
                  className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
                >
                  {cap.paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                  {cap.paused ? "Resume" : "Pause"}
                </button>
                <button
                  onClick={() => cap.restart()}
                  className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
                >
                  <RefreshCcw className="h-3.5 w-3.5" /> Reset
                </button>
                <button
                  onClick={() => setHelpOpen(true)}
                  className="grid h-8 w-8 place-items-center rounded-lg border bg-background hover:bg-accent"
                  aria-label="Help"
                >
                  <HelpCircle className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Kpi label="Total packets" value={cap.totalPackets.toLocaleString()} sub={`${cap.mode} mode`} />
              <Kpi label="Total bytes" value={formatBytes(cap.totalBytes)} sub="observed" />
              <Kpi label="Alerts" value={String(cap.alerts.length)} sub="anomalies" accent={cap.alerts.length ? "warn" : "ok"} />
              <Kpi label="Session" value={formatDuration(uptime)} sub="uptime" />
            </div>
          </section>

          {/* Overview: chart + alerts summary */}
          {tab === "overview" && (
            <section className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
              <div className="rounded-2xl border bg-card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      Traffic trend
                    </div>
                    <div className="text-sm font-semibold">Packet rate · last 60s</div>
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    live
                  </div>
                </div>
                <TrafficChart packets={cap.packets} />
              </div>
              <div className="rounded-2xl border bg-card p-4">
                <div className="mb-3">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Threat feed
                  </div>
                  <div className="text-sm font-semibold">Anomalies</div>
                </div>
                <AlertsPanel alerts={cap.alerts} />
              </div>
            </section>
          )}

          {/* Packet stream — shown on overview and packets tabs */}
          {(tab === "overview" || tab === "packets") && (
            <section className="rounded-2xl border bg-card">
              <div className="flex items-center justify-between border-b p-4">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Live capture
                  </div>
                  <div className="text-sm font-semibold">Packet stream</div>
                </div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {filter.size ? `${filter.size} filter` : "all protocols"}
                </div>
              </div>
              <div className={tab === "packets" ? "h-[calc(100vh-18rem)] min-h-[520px]" : "h-[520px]"}>
                <PacketStream packets={cap.packets} filter={filter as Set<string>} />
              </div>
            </section>
          )}

          {/* Alerts full panel */}
          {tab === "alerts" && (
            <section className="rounded-2xl border bg-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Threat feed
                  </div>
                  <div className="text-sm font-semibold">All anomalies ({cap.alerts.length})</div>
                </div>
              </div>
              <AlertsPanel alerts={cap.alerts} />
              {cap.alerts.length === 0 && (
                <p className="mt-4 text-sm text-muted-foreground">
                  No anomalies detected yet. Heuristics scan for SYN sweeps, high-entropy DNS
                  (tunneling / DGA candidates), and ARP conflict signals.
                </p>
              )}
            </section>
          )}

          {/* Agent tab — always show instructions */}
          {tab === "agent" && <AgentInstructions />}

          {/* Overview: show agent hint when waiting */}
          {tab === "overview" && cap.mode === "real" && cap.status !== "capturing" && (
            <AgentInstructions />
          )}
        </main>
      </div>

      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
    </div>
  );
}

function StatusPill({ status, mode }: { status: string; mode: string }) {
  const map: Record<string, { dot: string; label: string }> = {
    idle: { dot: "bg-muted-foreground", label: "idle" },
    waiting: { dot: "bg-warning", label: "waiting for agent" },
    capturing: { dot: "bg-success", label: "capturing" },
    paused: { dot: "bg-muted-foreground", label: "paused" },
  };
  const s = map[status] || map.idle;
  return (
    <span className="inline-flex items-center gap-2 rounded-full border bg-background px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
      <span className={`h-1.5 w-1.5 animate-pulse rounded-full ${s.dot}`} />
      {mode} · {s.label}
    </span>
  );
}

function Kpi({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "ok" | "warn";
}) {
  return (
    <div className="rounded-xl border bg-background p-3">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold tabular-nums sm:text-2xl">{value}</div>
      {sub && (
        <div
          className={`mt-0.5 text-[11px] ${
            accent === "warn" ? "text-warning" : accent === "ok" ? "text-success" : "text-muted-foreground"
          }`}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

function AgentInstructions() {
  const [copied, setCopied] = useState(false);
  const cmd = `python3 agent/sniffer.py --iface eth0 --url https://net-sentinel-live.onrender.com/api/public/ingest`;
  return (
    <section className="rounded-2xl border bg-card p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Real-mode agent
          </div>
          <h2 className="mt-1 text-lg font-semibold">Connect a capture agent</h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Browsers cannot access raw packets directly. Run the Python capture agent on the
            machine or router you want to observe. It uses <span className="font-mono">scapy</span>{" "}
            (Wireshark-class libpcap) to decode packets and streams them to this console.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border bg-warning/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-warning">
          <Radio className="h-3 w-3" /> waiting for packets
        </span>
      </div>
      <div className="mt-4 rounded-lg border bg-terminal p-3 font-mono text-[12px] text-terminal-foreground">
        <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-widest opacity-70">
          <span>run on your host (needs sudo for raw sockets)</span>
          <button
            className="rounded border border-emerald-500/30 px-2 py-0.5 hover:bg-emerald-500/10"
            onClick={() => {
              navigator.clipboard.writeText(cmd);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? "copied" : "copy"}
          </button>
        </div>
        <pre className="whitespace-pre-wrap break-all">{`sudo ${cmd}`}</pre>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        See <span className="font-mono">agent/README.md</span> in the repository for install steps and interface selection.
      </p>
    </section>
  );
}

function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Help & shortcuts</h3>
          <button className="grid h-8 w-8 place-items-center rounded-md hover:bg-accent" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 text-sm">
          <div>
            <div className="font-medium">Capture modes</div>
            <p className="text-muted-foreground">
              Demo generates synthesized traffic locally. Real mode subscribes to your Python
              agent via a server-sent event channel.
            </p>
          </div>
          <div>
            <div className="font-medium">Protocol filters</div>
            <p className="text-muted-foreground">
              Toggle protocols in the sidebar to narrow the packet stream. Counts show packets seen this session.
            </p>
          </div>
          <div>
            <div className="font-medium">Anomaly heuristics</div>
            <ul className="ml-4 list-disc text-muted-foreground">
              <li>SYN sweeps / port scans (≥8 distinct dst ports in 10s)</li>
              <li>High-entropy DNS (tunneling / DGA candidates)</li>
              <li>ARP conflict signals (potential spoofing)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
function formatDuration(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${sec}s`;
  return `${sec}s`;
}
