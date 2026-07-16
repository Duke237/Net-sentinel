// Shared packet event types + demo traffic generator + heuristic threat detection.

export type Protocol = "TCP" | "UDP" | "HTTP" | "HTTPS" | "DNS" | "TLS" | "ICMP" | "ARP";

export type PacketEvent = {
  id: string;
  ts: number; // epoch ms
  src: string;
  dst: string;
  srcPort?: number;
  dstPort?: number;
  protocol: Protocol;
  length: number;
  flags?: string;
  info?: string;
};

export type Alert = {
  id: string;
  ts: number;
  severity: "info" | "warning" | "critical";
  kind: string;
  message: string;
  relatedSrc?: string;
};

export const ALL_PROTOCOLS: Protocol[] = ["TCP", "UDP", "HTTP", "HTTPS", "DNS", "TLS", "ICMP", "ARP"];

export const PROTOCOL_COLOR: Record<Protocol, string> = {
  TCP: "text-info",
  UDP: "text-warning",
  HTTP: "text-success",
  HTTPS: "text-success",
  DNS: "text-warning",
  TLS: "text-info",
  ICMP: "text-muted-foreground",
  ARP: "text-destructive",
};

// ---------- Demo traffic generator ----------

const DEMO_HOSTS = [
  "192.168.1.12",
  "192.168.1.24",
  "192.168.1.55",
  "10.0.0.5",
  "10.0.0.42",
  "172.16.4.9",
];
const DEMO_EXTERNAL = [
  "142.250.190.14", // google
  "151.101.1.140", // fastly
  "104.16.132.229", // cloudflare
  "52.85.132.10", // aws
  "8.8.8.8",
  "1.1.1.1",
];
const DEMO_DOMAINS = ["api.github.com", "cdn.jsdelivr.net", "fonts.googleapis.com", "s3.amazonaws.com"];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

let demoCounter = 0;

export function generateDemoPacket(): PacketEvent {
  demoCounter++;
  const now = Date.now();
  // Occasional suspicious pattern
  const suspicious = Math.random() < 0.05;
  const proto = suspicious
    ? pick(["TCP", "DNS", "ARP"] as Protocol[])
    : pick(ALL_PROTOCOLS);
  const src = Math.random() < 0.6 ? pick(DEMO_HOSTS) : pick(DEMO_EXTERNAL);
  const dst = src.startsWith("192.") || src.startsWith("10.") || src.startsWith("172.")
    ? pick(DEMO_EXTERNAL)
    : pick(DEMO_HOSTS);
  const p: PacketEvent = {
    id: `pkt_${now}_${demoCounter}`,
    ts: now,
    src,
    dst,
    protocol: proto,
    length: 40 + Math.floor(Math.random() * 1400),
  };
  switch (proto) {
    case "TCP":
      p.srcPort = 1024 + Math.floor(Math.random() * 60000);
      p.dstPort = pick([80, 443, 22, 3306, 5432, 8080]);
      p.flags = suspicious ? "SYN" : pick(["SYN,ACK", "ACK", "PSH,ACK", "FIN,ACK"]);
      p.info = `${p.flags} seq=${Math.floor(Math.random() * 1e9)}`;
      break;
    case "UDP":
      p.srcPort = 1024 + Math.floor(Math.random() * 60000);
      p.dstPort = pick([53, 123, 5353, 1900]);
      p.info = `len=${p.length}`;
      break;
    case "HTTP":
      p.dstPort = 80;
      p.info = `${pick(["GET", "POST"])} ${pick(["/api/users", "/health", "/index.html", "/assets/app.js"])}`;
      break;
    case "HTTPS":
    case "TLS":
      p.dstPort = 443;
      p.info = pick(["Client Hello", "Server Hello", "Application Data", "Certificate"]);
      break;
    case "DNS":
      p.dstPort = 53;
      p.info = `Standard query ${pick(["A", "AAAA", "TXT"])} ${
        suspicious
          ? Array.from({ length: 24 }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join("") +
            ".example.net"
          : pick(DEMO_DOMAINS)
      }`;
      break;
    case "ICMP":
      p.info = pick(["Echo request", "Echo reply", "Destination unreachable"]);
      break;
    case "ARP":
      p.info = suspicious
        ? `Who has ${dst}? Tell ${src} (conflicting MAC)`
        : `Who has ${dst}? Tell ${src}`;
      break;
  }
  return p;
}

// ---------- Heuristic threat detection ----------

type DetectionState = {
  synBySource: Map<string, { count: number; ports: Set<number>; firstTs: number }>;
  arpBySource: Map<string, number>;
  dnsHighEntropy: number;
};

export function createDetector() {
  const state: DetectionState = {
    synBySource: new Map(),
    arpBySource: new Map(),
    dnsHighEntropy: 0,
  };

  function entropy(s: string): number {
    const freq: Record<string, number> = {};
    for (const c of s) freq[c] = (freq[c] || 0) + 1;
    const len = s.length || 1;
    let h = 0;
    for (const k in freq) {
      const p = freq[k] / len;
      h -= p * Math.log2(p);
    }
    return h;
  }

  return function detect(pkt: PacketEvent): Alert | null {
    // SYN sweep detection
    if (pkt.protocol === "TCP" && pkt.flags?.includes("SYN") && !pkt.flags?.includes("ACK")) {
      const entry = state.synBySource.get(pkt.src) || { count: 0, ports: new Set<number>(), firstTs: pkt.ts };
      entry.count++;
      if (pkt.dstPort) entry.ports.add(pkt.dstPort);
      // reset window if >10s
      if (pkt.ts - entry.firstTs > 10_000) {
        entry.count = 1;
        entry.ports = new Set(pkt.dstPort ? [pkt.dstPort] : []);
        entry.firstTs = pkt.ts;
      }
      state.synBySource.set(pkt.src, entry);
      if (entry.ports.size >= 8) {
        state.synBySource.delete(pkt.src);
        return {
          id: `alert_${pkt.id}`,
          ts: pkt.ts,
          severity: "critical",
          kind: "SYN sweep / port scan",
          message: `Host ${pkt.src} sent SYN to ${entry.ports.size} distinct ports in <10s`,
          relatedSrc: pkt.src,
        };
      }
    }
    // ARP spoofing hint
    if (pkt.protocol === "ARP" && pkt.info?.includes("conflicting")) {
      return {
        id: `alert_${pkt.id}`,
        ts: pkt.ts,
        severity: "warning",
        kind: "ARP anomaly",
        message: `Conflicting ARP reply observed from ${pkt.src}`,
        relatedSrc: pkt.src,
      };
    }
    // High-entropy DNS
    if (pkt.protocol === "DNS" && pkt.info) {
      const m = pkt.info.match(/[A-Za-z0-9-]{16,}\.[A-Za-z]{2,}/);
      if (m && entropy(m[0]) > 3.5) {
        return {
          id: `alert_${pkt.id}`,
          ts: pkt.ts,
          severity: "warning",
          kind: "High-entropy DNS",
          message: `Suspicious DNS query "${m[0].slice(0, 40)}" from ${pkt.src}`,
          relatedSrc: pkt.src,
        };
      }
    }
    return null;
  };
}
