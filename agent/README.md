# NetSentinel Capture Agent

The capture agent is a small Python sniffer that runs on the host you want to
observe (a laptop, a server, or a Linux router). It decodes packet headers
locally using `scapy` (a Wireshark-class libpcap wrapper) and streams
structured events to your NetSentinel console over HTTPS.

Only structured metadata is sent — no raw payloads.

## Requirements

- Linux or macOS with libpcap (Windows works via Npcap)
- Python 3.9+
- Root / `sudo` (needed for raw sockets — same permission Wireshark needs)

Install dependencies:

```bash
sudo apt-get install -y tcpdump python3-pip     # Debian/Ubuntu
pip3 install scapy requests
```

On macOS:

```bash
brew install libpcap
pip3 install scapy requests
```

## Run

Point it at your deployed console's public ingest endpoint:

```bash
sudo python3 agent/sniffer.py \
  --iface eth0 \
  --url https://net-sentinel-live.onrender.com/api/public/ingest
```

Open your console in the browser, switch to **Real** capture mode, and
packets will start flowing into the live stream within a second.

## Options

| Flag       | Default                                                          | Description                              |
|------------|------------------------------------------------------------------|------------------------------------------|
| `--iface`  | auto                                                             | Interface to sniff (`eth0`, `wlan0`, …)  |
| `--url`    | `https://net-sentinel-live.onrender.com/api/public/ingest`       | Console ingest endpoint                  |
| `--bpf`    | *(none)*                                      | BPF filter, e.g. `"tcp or udp"`          |
| `--batch`  | `20`                                          | Events per POST batch                    |
| `--agent`  | hostname                                      | Agent identifier shown in the console    |

## Picking an interface

```bash
ip -brief link            # Linux
ifconfig                  # macOS / BSD
```

Common values: `eth0`, `enp0s3`, `wlan0`, `wlp3s0`, `en0`.

## Troubleshooting

- **"Operation not permitted"** — you forgot `sudo`.
- **No packets** — try `--iface any` on Linux, or check that traffic actually
  reaches the interface (mirror port / monitor mode may be needed on a switch).
- **Corporate proxy blocks POSTs** — allowlist your NetSentinel host or run
  the agent from a machine with direct egress.

## Security model

- The agent runs entirely on your own infrastructure.
- Raw packet payloads are decoded locally and never leave the host.
- Only structured event metadata (timestamp, addresses, ports, protocol,
  length, flags, short info string) is streamed to the console.
