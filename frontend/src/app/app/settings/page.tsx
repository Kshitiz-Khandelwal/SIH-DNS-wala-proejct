"use client";

import { useEffect, useRef, useState } from "react";
import { getThresholds, runSimulator, setThresholds } from "@/lib/api";
import type { SimulatorType, ThresholdConfig } from "@/lib/types";
import { cn } from "@/lib/utils";

const SIMULATORS: { type: SimulatorType; label: string; desc: string }[] = [
  { type: "benign", label: "Benign", desc: "Normal corporate lookup" },
  { type: "dga", label: "DGA", desc: "High-entropy generated domain" },
  { type: "typosquat", label: "Typosquat", desc: "Homoglyph credential phish" },
  { type: "c2_beaconing", label: "C2 Beaconing", desc: "Known malware C2 host" },
  { type: "dns_tunnelling", label: "DNS Tunnelling", desc: "Random subdomain exfil pattern" },
];

export default function SettingsPage() {
  const [thresholds, setLocalThresholds] = useState<ThresholdConfig>({
    allow_max: 40,
    flag_max: 70,
  });
  const [simulating, setSimulating] = useState<SimulatorType | null>(null);
  const [simResult, setSimResult] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getThresholds().then(setLocalThresholds).catch(() => {});
  }, []);

  async function handleThresholdChange(key: keyof ThresholdConfig, value: number) {
    const next = { ...thresholds, [key]: value };
    setLocalThresholds(next);
    await setThresholds(next);
  }

  async function handleSimulate(type: SimulatorType) {
    setSimulating(type);
    setSimResult(null);
    try {
      const result = await runSimulator(type);
      setSimResult(`${result.domain} → ${result.verdict} (${result.risk_score})`);
    } catch {
      setSimResult("Simulation failed");
    } finally {
      setSimulating(null);
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setSimResult(`Queued offline import: ${file.name} — results will appear in queue tagged "offline import"`);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text">Settings</h1>
        <p className="mt-1 text-sm text-muted">Thresholds, lab simulators, and passive analysis.</p>
      </div>

      <section className="rounded-lg border border-line bg-panel p-5">
        <h2 className="font-display text-lg font-semibold text-text">Verdict thresholds</h2>
        <p className="mt-1 text-xs text-muted">
          ALLOW &lt; {thresholds.allow_max + 1} · FLAG {thresholds.allow_max + 1}–{thresholds.flag_max} · BLOCK &gt; {thresholds.flag_max}
        </p>

        <div className="mt-4 h-3 overflow-hidden rounded-full">
          <div className="flex h-full">
            <div
              className="bg-trace/60"
              style={{ width: `${thresholds.allow_max}%` }}
            />
            <div
              className="bg-signal-amber/60"
              style={{ width: `${thresholds.flag_max - thresholds.allow_max}%` }}
            />
            <div
              className="bg-alert/60"
              style={{ width: `${100 - thresholds.flag_max}%` }}
            />
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-muted">ALLOW max</span>
            <input
              type="number"
              min={0}
              max={99}
              value={thresholds.allow_max}
              onChange={(e) =>
                handleThresholdChange("allow_max", Number(e.target.value))
              }
              className="mt-1 w-full rounded border border-line bg-panel-raised px-3 py-2 font-mono text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="text-muted">FLAG max (BLOCK above)</span>
            <input
              type="number"
              min={1}
              max={100}
              value={thresholds.flag_max}
              onChange={(e) =>
                handleThresholdChange("flag_max", Number(e.target.value))
              }
              className="mt-1 w-full rounded border border-line bg-panel-raised px-3 py-2 font-mono text-sm"
            />
          </label>
        </div>
      </section>

      <section className="rounded-lg border border-line bg-panel p-5">
        <h2 className="font-display text-lg font-semibold text-text">Lab simulators</h2>
        <p className="mt-1 text-xs text-muted">
          Inject synthetic traffic into the live queue.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {SIMULATORS.map(({ type, label, desc }) => (
            <button
              key={type}
              type="button"
              onClick={() => handleSimulate(type)}
              disabled={simulating !== null}
              className={cn(
                "rounded-lg border border-line bg-panel-raised p-3 text-left transition-colors duration-120 hover:border-trace/40",
                simulating === type && "opacity-60",
              )}
            >
              <p className="font-display text-sm font-semibold text-text">{label}</p>
              <p className="mt-0.5 text-xs text-muted">{desc}</p>
            </button>
          ))}
        </div>
        {simResult && (
          <p className="mt-3 font-mono text-xs text-trace">{simResult}</p>
        )}
      </section>

      <section className="rounded-lg border border-line bg-panel p-5">
        <h2 className="font-display text-lg font-semibold text-text">Passive analysis</h2>
        <p className="mt-1 text-xs text-muted">
          Upload PCAP or Zeek logs for offline pipeline analysis.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".pcap,.pcapng,.log,.txt"
          onChange={handleFileUpload}
          className="mt-4 block w-full text-sm text-muted file:mr-4 file:rounded-lg file:border-0 file:bg-panel-raised file:px-4 file:py-2 file:text-sm file:text-trace"
        />
      </section>
    </div>
  );
}
