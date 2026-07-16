#!/usr/bin/env python3
"""
NetSentinel Capture Agent

Streams decoded packet metadata from a Linux network interface to the
NetSentinel console via the /api/public/ingest endpoint.

Requirements:
    sudo apt install python3-pip tcpdump
    pip3 install scapy requests

Usage (needs sudo for raw sockets, same permission Wireshark needs):
    sudo python3 agent/sniffer.py --iface eth0 --url https://net-sentinel-live.onrender.com/api/public/ingest

Options:
    --iface   Interface to sniff (default: auto)
    --url     Ingest endpoint (default: https://net-sentinel-live.onrender.com/api/public/ingest)
    --bpf     BPF filter (default: "")   e.g. "tcp or udp"
    --batch   Batch size before POSTing (default: 20)
    --agent   Agent identifier (default: hostname)
"""
from __future__ import annotations
import argparse
import os
import socket
import sys
import time
import uuid
from threading import Lock

try:
    from scapy.all import sniff, IP, IPv6, TCP, UDP, ICMP, ARP, DNS, Raw  # type: ignore
except ImportError:
    print("Missing dependency: scapy. Install with: pip3 install scapy", file=sys.stderr)
    sys.exit(1)

try:
    import requests
except ImportError:
    print("Missing dependency: requests. Install with: pip3 install requests", file=sys.stderr)
    sys.exit(1)


def classify(pkt) -> tuple[str, dict]:
    info: dict = {}
    proto = "TCP"
    if pkt.haslayer(ARP):
        arp = pkt[ARP]
        return "ARP", {
            "src": arp.psrc,
            "dst": arp.pdst,
            "info": f"Who has {arp.pdst}? Tell {arp.psrc}",
        }
    l3 = pkt.getlayer(IP) or pkt.getlayer(IPv6)
    if l3 is None:
        return "", {}
    src = l3.src
    dst = l3.dst
    if pkt.haslayer(TCP):
        t = pkt[TCP]
        flags = str(t.flags)
        dport = int(t.dport)
        sport = int(t.sport)
        if dport == 80 or sport == 80:
            proto = "HTTP"
        elif dport == 443 or sport == 443:
            proto = "HTTPS"
        else:
            proto = "TCP"
        info = {
            "src": src, "dst": dst, "srcPort": sport, "dstPort": dport,
            "flags": flags, "info": f"{flags} seq={int(t.seq)}",
        }
        return proto, info
    if pkt.haslayer(UDP):
        u = pkt[UDP]
        dport = int(u.dport); sport = int(u.sport)
        proto = "DNS" if (dport == 53 or sport == 53) else "UDP"
        if proto == "DNS" and pkt.haslayer(DNS):
            d = pkt[DNS]
            try:
                q = d.qd.qname.decode() if d.qd else ""
            except Exception:
                q = ""
            info = {"src": src, "dst": dst, "srcPort": sport, "dstPort": dport,
                    "info": f"Standard query A {q}"}
        else:
            info = {"src": src, "dst": dst, "srcPort": sport, "dstPort": dport,
                    "info": f"len={len(pkt)}"}
        return proto, info
    if pkt.haslayer(ICMP):
        return "ICMP", {"src": src, "dst": dst, "info": "ICMP"}
    return "TCP", {"src": src, "dst": dst, "info": "raw"}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--iface", default=None)
    ap.add_argument("--url", default="https://net-sentinel-live.onrender.com/api/public/ingest")
    ap.add_argument("--bpf", default="")
    ap.add_argument("--batch", type=int, default=20)
    ap.add_argument("--agent", default=socket.gethostname())
    args = ap.parse_args()

    if os.geteuid() != 0:
        print("[warn] not running as root — packet capture will fail. Try: sudo python3 agent/sniffer.py ...", file=sys.stderr)

    batch: list[dict] = []
    lock = Lock()
    session = requests.Session()

    def flush() -> None:
        with lock:
            if not batch:
                return
            payload = {"agentId": args.agent, "events": batch[:]}
            batch.clear()
        try:
            r = session.post(args.url, json=payload, timeout=5)
            if r.status_code >= 400:
                print(f"[ingest] {r.status_code}: {r.text[:200]}", file=sys.stderr)
        except Exception as e:
            print(f"[ingest] error: {e}", file=sys.stderr)

    def on_pkt(pkt) -> None:
        proto, fields = classify(pkt)
        if not proto:
            return
        evt = {
            "id": f"pkt_{int(time.time()*1000)}_{uuid.uuid4().hex[:8]}",
            "ts": int(time.time() * 1000),
            "protocol": proto,
            "length": int(len(pkt)),
            **fields,
        }
        with lock:
            batch.append(evt)
            full = len(batch) >= args.batch
        if full:
            flush()

    print(f"[netsentinel-agent] streaming to {args.url} (iface={args.iface or 'auto'}, bpf={args.bpf or 'none'})")
    print("Press Ctrl+C to stop.")
    try:
        # Periodic flush regardless of batch size
        from threading import Thread
        stop = False
        def periodic():
            while not stop:
                time.sleep(1.0)
                flush()
        Thread(target=periodic, daemon=True).start()
        sniff(iface=args.iface, filter=args.bpf or None, prn=on_pkt, store=False)
    except KeyboardInterrupt:
        pass
    finally:
        flush()


if __name__ == "__main__":
    main()
