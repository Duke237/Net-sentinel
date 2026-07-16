import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowRight, Radio, ShieldAlert, Terminal, Users } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NetSentinel — Live Network Traffic Monitor" },
      {
        name: "description",
        content:
          "Real-time browser-based network monitoring: capture traffic, identify protocols, and analyze normal vs suspicious packets.",
      },
      { property: "og:title", content: "NetSentinel — Live Network Traffic Monitor" },
      {
        property: "og:description",
        content: "Wireshark-class live view of network traffic in your browser.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const { user, ready } = useAuth();

  useEffect(() => {
    if (ready && getCurrentUser()) {
      // Optional: auto-forward returning users. Keep landing viewable via /
      // when signed out.
    }
  }, [ready]);

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="inline-flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Terminal className="h-4 w-4" />
          </span>
          <span className="font-semibold tracking-tight">NetSentinel</span>
        </div>
        <nav className="flex items-center gap-3 text-sm">
          {user ? (
            <button
              onClick={() => navigate({ to: "/console" })}
              className="rounded-lg bg-primary px-3 py-1.5 text-primary-foreground"
            >
              Open console
            </button>
          ) : (
            <>
              <Link to="/auth" className="text-muted-foreground hover:text-foreground">
                Sign in
              </Link>
              <Link
                to="/auth"
                className="rounded-lg bg-primary px-3 py-1.5 text-primary-foreground"
              >
                Get started
              </Link>
            </>
          )}
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-6 pt-8 pb-20 lg:pt-16">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              live network monitor
            </span>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
              Watch every packet <span className="text-muted-foreground">on your network</span>,
              in real time.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
              NetSentinel converts raw packet capture from any Linux host into a live, filterable
              stream of protocol-decoded events, traffic analytics, and anomaly alerts — all in a
              modern operator console.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to={user ? "/console" : "/auth"}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Enter console <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#capabilities"
                className="inline-flex items-center gap-2 rounded-lg border bg-card px-4 py-2.5 text-sm font-medium hover:bg-accent"
              >
                See capabilities
              </a>
            </div>
            <p className="mt-4 font-mono text-[11px] text-muted-foreground">
              demo mode preloaded · connect the python agent for real traffic
            </p>
          </div>

          <div className="terminal-panel rounded-2xl border border-emerald-500/20 p-4 shadow-xl">
            <div className="mb-3 flex items-center gap-2 text-[11px] opacity-70">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              <span className="ml-2">netsentinel — live</span>
            </div>
            <pre className="overflow-hidden text-[11px] leading-relaxed">
{`12:04:31.221  TCP    192.168.1.24:52310 -> 142.250.190.14:443   PSH,ACK
12:04:31.223  DNS    192.168.1.24:53912 -> 1.1.1.1:53              A cdn.jsdelivr.net
12:04:31.226  HTTPS  10.0.0.5:52001     -> 151.101.1.140:443       Application Data
12:04:31.229  TCP    172.16.4.9:44311   -> 8.8.8.8:53             SYN
[warn] SYN sweep detected — 10.0.0.42 -> 12 ports in 8s
12:04:31.232  ARP    10.0.0.1 -> 10.0.0.24                        Who has 10.0.0.24?`}
            </pre>
          </div>
        </div>

        <div id="capabilities" className="mt-24 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Radio, title: "Real-time packet stream", body: "Every frame decoded with source, dest, protocol, length, and flags." },
            { icon: Terminal, title: "Protocol filters", body: "Slice traffic by TCP, UDP, HTTP, DNS, TLS, ICMP, or ARP." },
            { icon: ShieldAlert, title: "Anomaly detection", body: "SYN sweeps, ARP spoofing, and high-entropy DNS heuristics." },
            { icon: Users, title: "Operator experience", body: "Terminal-style boot, dark monospace UI, responsive SOC layout." },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl border bg-card p-5">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-accent-foreground">
                <Icon className="h-4 w-4" />
              </span>
              <h3 className="mt-3 text-sm font-semibold">{title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>
      <footer className="mx-auto max-w-6xl border-t px-6 py-6 text-center text-xs text-muted-foreground">
        NetSentinel · Live Network Traffic Monitor
      </footer>
    </div>
  );
}
