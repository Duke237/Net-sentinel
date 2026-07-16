import { useCallback, useEffect, useRef, useState } from "react";
import { createDetector, generateDemoPacket, type Alert, type PacketEvent } from "@/lib/packets";

export type CaptureMode = "demo" | "real";
export type CaptureStatus = "idle" | "waiting" | "capturing" | "paused";

const MAX_PACKETS = 500;
const MAX_ALERTS = 50;

export function useCapture() {
  const [mode, setMode] = useState<CaptureMode>("demo");
  const [status, setStatus] = useState<CaptureStatus>("idle");
  const [paused, setPaused] = useState(false);
  const [packets, setPackets] = useState<PacketEvent[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [totalBytes, setTotalBytes] = useState(0);
  const [totalPackets, setTotalPackets] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);

  const detectorRef = useRef(createDetector());
  const pausedRef = useRef(false);
  const bufferRef = useRef<PacketEvent[]>([]);
  const alertBufRef = useRef<Alert[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const ingest = useCallback((pkt: PacketEvent) => {
    if (pausedRef.current) return;
    bufferRef.current.push(pkt);
    const a = detectorRef.current(pkt);
    if (a) alertBufRef.current.push(a);
  }, []);

  // Flush buffer to state ~10 fps to keep React fast
  useEffect(() => {
    const flush = setInterval(() => {
      if (bufferRef.current.length === 0 && alertBufRef.current.length === 0) return;
      const newPkts = bufferRef.current;
      bufferRef.current = [];
      const newAlerts = alertBufRef.current;
      alertBufRef.current = [];
      setPackets((prev) => [...newPkts.reverse(), ...prev].slice(0, MAX_PACKETS));
      setTotalPackets((n) => n + newPkts.length);
      setTotalBytes((n) => n + newPkts.reduce((s, p) => s + p.length, 0));
      if (newAlerts.length) {
        setAlerts((prev) => [...newAlerts.reverse(), ...prev].slice(0, MAX_ALERTS));
      }
    }, 100);
    return () => clearInterval(flush);
  }, []);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    setStatus("idle");
  }, []);

  const start = useCallback(
    (m: CaptureMode) => {
      stop();
      setMode(m);
      setPackets([]);
      setAlerts([]);
      setTotalBytes(0);
      setTotalPackets(0);
      setStartedAt(Date.now());
      detectorRef.current = createDetector();
      bufferRef.current = [];
      alertBufRef.current = [];

      if (m === "demo") {
        setStatus("capturing");
        // Randomized burst rate: ~15-30 packets/sec
        timerRef.current = setInterval(() => {
          const n = 1 + Math.floor(Math.random() * 4);
          for (let i = 0; i < n; i++) ingest(generateDemoPacket());
        }, 100);
      } else {
        setStatus("waiting");
        try {
          const es = new EventSource("/api/public/stream");
          esRef.current = es;
          es.addEventListener("hello", () => setStatus("waiting"));
          es.addEventListener("packet", (ev) => {
            try {
              const pkt = JSON.parse((ev as MessageEvent).data) as PacketEvent;
              if (status !== "capturing") setStatus("capturing");
              ingest(pkt);
            } catch {
              /* ignore */
            }
          });
          es.onerror = () => {
            // keep waiting; browser will auto-reconnect
          };
        } catch {
          setStatus("idle");
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ingest, stop],
  );

  useEffect(() => {
    // Auto-start in demo mode on mount
    start("demo");
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Promote status to "capturing" as soon as real packets arrive.
  useEffect(() => {
    if (mode === "real" && status === "waiting" && packets.length > 0) {
      setStatus("capturing");
    }
  }, [mode, status, packets.length]);

  return {
    mode,
    status,
    paused,
    setPaused,
    packets,
    alerts,
    totalBytes,
    totalPackets,
    startedAt,
    setMode: (m: CaptureMode) => start(m),
    restart: () => start(mode),
  };
}
