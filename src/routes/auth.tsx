import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Terminal } from "lucide-react";
import { getCurrentUser, login, register } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in · NetSentinel" },
      { name: "description", content: "Sign in to your NetSentinel operator console." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("register");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (getCurrentUser()) navigate({ to: "/console" });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      if (mode === "register") await register(email, password, name);
      else await login(email, password);
      navigate({ to: "/console" });
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <div className="terminal-panel hidden flex-col justify-between p-10 lg:flex">
        <Link to="/" className="inline-flex items-center gap-2 text-emerald-300">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-500/15">
            <Terminal className="h-4 w-4" />
          </span>
          <span className="font-mono text-sm">netsentinel</span>
        </Link>
        <div className="max-w-md space-y-4">
          <h1 className="text-3xl font-semibold leading-tight">
            Live network traffic monitoring, built for operators.
          </h1>
          <p className="text-sm opacity-80">
            Capture, decode, and analyze packets in real time. Correlate suspicious activity
            with built-in heuristics for SYN sweeps, ARP anomalies, and DNS tunneling.
          </p>
          <pre className="rounded-lg border border-emerald-500/20 bg-black/40 p-4 text-[11px] leading-relaxed">
{`> netsentinel start
[ok] channel opened
[ok] agent registered
[ok] capturing on eth0`}
          </pre>
        </div>
        <p className="text-[11px] opacity-60">© NetSentinel — operator console</p>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              {mode === "register" ? "Create your account" : "Welcome back"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "register"
                ? "Register with just an email and password. No verification required."
                : "Sign in to your operator console."}
            </p>
          </div>

          {mode === "register" && (
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Display name (optional)</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Salung"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {err && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {err}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {busy ? "Please wait…" : mode === "register" ? "Create account" : "Sign in"}
          </button>

          <p className="text-center text-xs text-muted-foreground">
            {mode === "register" ? "Already have an account?" : "New to NetSentinel?"}{" "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "register" ? "login" : "register");
                setErr(null);
              }}
              className="font-medium text-foreground underline-offset-2 hover:underline"
            >
              {mode === "register" ? "Sign in" : "Create an account"}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
