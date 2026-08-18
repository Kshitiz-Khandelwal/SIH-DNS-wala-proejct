"use client";

import { useEffect, useRef, useState } from "react";
import { getThresholds, runSimulator, setThresholds } from "@/lib/api";
import type { SimulatorType, ThresholdConfig } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Sliders, Play, Upload, Shield, Zap, CheckCircle2 } from "lucide-react";

const SIMULATORS: { type: SimulatorType; label: string; desc: string }[] = [
  { type: "benign", label: "Benign Lookup", desc: "Standard corporate lookup (e.g. google.com)" },
  { type: "dga", label: "DGA Domain", desc: "Algorithmic high-entropy domain string" },
  { type: "typosquat", label: "Typosquat Phish", desc: "Homoglyph brand lookalike domain" },
  { type: "c2_beaconing", label: "C2 Beaconing", desc: "Periodic command & control signal" },
  { type: "dns_tunnelling", label: "DNS Tunnelling", desc: "Subdomain base32 data exfiltration" },
];

export default function SettingsPage() {
  const [thresholds, setLocalThresholds] = useState<ThresholdConfig>({
    allow_max: 40,
    flag_max: 70,
  });
  const [simulating, setSimulating] = useState<SimulatorType | null>(null);
  const [simResult, setSimResult] = useState<string | null>(null);
  const [savedToast, setSavedToast] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getThresholds().then(setLocalThresholds).catch(() => {});
  }, []);

  async function handleThresholdChange(key: keyof ThresholdConfig, value: number) {
    const next = { ...thresholds, [key]: value };
    setLocalThresholds(next);
    await setThresholds(next);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  }

  async function handleSimulate(type: SimulatorType) {
    setSimulating(type);
    setSimResult(null);
    try {
      const result = await runSimulator(type);
      setSimResult(`${result.domain} → ${result.verdict} (Risk Score: ${result.risk_score}/100)`);
    } catch {
      setSimResult("Simulation payload execution failed.");
    } finally {
      setSimulating(null);
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setSimResult(`Queued offline capture: ${file.name} (Pipeline offline analysis initiated)`);
    }
  }

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl font-sans">
              System Configuration &amp; Rules
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
              <Sliders className="h-3.5 w-3.5" /> Arbiter Policy
            </span>
          </div>
          <p className="mt-1.5 text-sm text-slate-600">
            Tune risk scoring decision boundaries, execute synthetic test payloads, and ingest offline PCAP dumps.
          </p>
        </div>

        {savedToast && (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" /> Policy Updated
          </div>
        )}
      </div>

      {/* Decision Boundaries / Thresholds */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
          ARBITER BOUNDARIES
        </span>
        <h2 className="text-base font-bold text-slate-900 mt-0.5 mb-1">
          Verdict Classification Thresholds
        </h2>
        <p className="text-xs text-slate-500 mb-5 font-mono">
          ALLOW: 0–{thresholds.allow_max} · FLAG: {thresholds.allow_max + 1}–{thresholds.flag_max} · BLOCK: &gt;{thresholds.flag_max}
        </p>

        {/* Visual Threshold Bar */}
        <div className="h-4 overflow-hidden rounded-full border border-slate-200 bg-slate-100 flex shadow-inner">
          <div
            className="bg-emerald-500 h-full transition-all duration-300 flex items-center justify-center text-[10px] font-mono font-bold text-white"
            style={{ width: `${thresholds.allow_max}%` }}
          >
            ALLOW
          </div>
          <div
            className="bg-amber-500 h-full transition-all duration-300 flex items-center justify-center text-[10px] font-mono font-bold text-white"
            style={{ width: `${thresholds.flag_max - thresholds.allow_max}%` }}
          >
            FLAG
          </div>
          <div
            className="bg-rose-500 h-full transition-all duration-300 flex items-center justify-center text-[10px] font-mono font-bold text-white"
            style={{ width: `${100 - thresholds.flag_max}%` }}
          >
            BLOCK
          </div>
        </div>

        {/* Controls */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <label className="block">
              <span className="text-xs font-semibold text-slate-700 block">ALLOW Boundary Max (0 to 99)</span>
              <span className="text-[11px] text-slate-400 block mb-2 font-mono">Scores below this are allowed without review</span>
              <input
                type="number"
                min={0}
                max={99}
                value={thresholds.allow_max}
                onChange={(e) => handleThresholdChange("allow_max", Number(e.target.value))}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 shadow-2xs"
              />
            </label>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <label className="block">
              <span className="text-xs font-semibold text-slate-700 block">FLAG Boundary Max (BLOCK Above)</span>
              <span className="text-[11px] text-slate-400 block mb-2 font-mono">Scores above this trigger zero-day hard block</span>
              <input
                type="number"
                min={1}
                max={100}
                value={thresholds.flag_max}
                onChange={(e) => handleThresholdChange("flag_max", Number(e.target.value))}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 shadow-2xs"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Lab Simulators */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
          TEST HARNESS
        </span>
        <h2 className="text-base font-bold text-slate-900 mt-0.5 mb-1">
          Synthetic Attack Verification Simulators
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Inject synthetic DNS packets directly into the 7-stage engine to evaluate live response times.
        </p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SIMULATORS.map(({ type, label, desc }) => (
            <button
              key={type}
              type="button"
              onClick={() => handleSimulate(type)}
              disabled={simulating !== null}
              className={cn(
                "rounded-xl border border-slate-200 bg-white p-4 text-left transition-all hover:border-blue-300 hover:bg-blue-50/40 shadow-2xs flex flex-col justify-between",
                simulating === type && "opacity-50 cursor-wait"
              )}
            >
              <div className="flex items-center justify-between w-full mb-1.5">
                <span className="text-xs font-bold text-slate-900">{label}</span>
                <Play className="h-3.5 w-3.5 text-slate-400" />
              </div>
              <p className="text-[11px] text-slate-500 font-mono">{desc}</p>
            </button>
          ))}
        </div>

        {simResult && (
          <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/60 p-3 font-mono text-xs text-blue-900 font-semibold">
            {simResult}
          </div>
        )}
      </div>

      {/* Passive Analysis / PCAP Upload */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
          OFFLINE FORENSICS
        </span>
        <h2 className="text-base font-bold text-slate-900 mt-0.5 mb-1">
          Passive PCAP / Zeek Log File Ingestion
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Upload packet captures (.pcap, .pcapng) or Zeek DNS logs to replay through the scoring engine.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".pcap,.pcapng,.log,.txt"
          onChange={handleFileUpload}
          className="block w-full text-xs text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-blue-700 hover:file:bg-blue-100 transition"
        />
      </div>
    </div>
  );
}
