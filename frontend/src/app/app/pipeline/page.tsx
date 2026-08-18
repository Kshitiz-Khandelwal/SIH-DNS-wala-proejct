"use client";

import { useEffect, useState } from "react";
import { getEvents, getStats } from "@/lib/api";
import type { QueryResult, PipelineStage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Zap, Activity, CheckCircle2, ShieldAlert, Layers } from "lucide-react";

// ─── Stage metadata ──────────────────────────────────────────
const STAGE_META = [
  { num: "01", name: "DETERMINISTIC ALLOWLIST", service: "redis-cache", port: "6379", latency: "<0.1ms" },
  { num: "02", name: "THREAT INTEL FEEDS",      service: "threat-intel", port: "8003", latency: "0.2ms" },
  { num: "03", name: "LEXICAL & ENTROPY SCAN", service: "lexical-eng",  port: "8000", latency: "0.4ms" },
  { num: "04", name: "DGA RANDOM FOREST ML",    service: "ml-inference", port: "8001", latency: "1.1ms" },
  { num: "05", name: "HOMOGLYPH & PHISHING",    service: "homoglyph-eng", port: "8002", latency: "0.8ms" },
  { num: "06", name: "DNS TUNNELLING DETECTOR", service: "tunnel-exfil", port: "8004", latency: "1.2ms" },
  { num: "07", name: "SHAP EXPLAINABILITY",     service: "shap-arbiter", port: "8005", latency: "0.9ms" },
];

function statusColor(contribution: number): string {
  if (contribution === 0) return "#059669";
  if (contribution >= 70) return "#dc2626";
  if (contribution >= 40) return "#d97706";
  if (contribution >= 10) return "#059669";
  return "#64748b";
}

function statusLabel(contribution: number, isActive: boolean): string {
  if (isActive) return "EVALUATING";
  if (contribution === 0) return "CLEAN PASS";
  if (contribution >= 70) return "CRITICAL BLOCK";
  if (contribution >= 40) return "FLAGGED";
  return "PASS";
}

function verdictColor(verdict: string): string {
  if (verdict === "BLOCK") return "#dc2626";
  if (verdict === "FLAG") return "#d97706";
  return "#059669";
}

const DEMO_FEATURES = [
  { name: "Entropy", value: "3.81 / 5.0", contribution: 22.9, bar: 76 },
  { name: "DGA Probability", value: "0.89", contribution: 31.2, bar: 89 },
  { name: "N-gram Rarity", value: "0.76", contribution: 15.2, bar: 76 },
  { name: "Length Score", value: "15 chars", contribution: 2.0, bar: 30 },
  { name: "Typosquat Similarity", value: "0.12", contribution: 1.8, bar: 12 },
];

const DEMO_ANALYSIS = [
  { label: "DGA Probability", value: 0.89, max: 1.0, color: "#ef4444" },
  { label: "Entropy Score", value: 3.81, max: 5.0, color: "#ef4444" },
  { label: "N-gram Rarity", value: 0.76, max: 1.0, color: "#f97316" },
  { label: "Typosquat Similarity", value: 0.12, max: 1.0, color: "#10b981" },
  { label: "ML Confidence", value: 0.91, max: 1.0, color: "#10b981" },
];

// ─── Cylinder node ──────────────────────────────────────────
function CylinderNode({
  stage, isActive, onClick, pipeline,
}: {
  stage: typeof STAGE_META[0];
  isActive: boolean;
  onClick: () => void;
  pipeline?: PipelineStage;
}) {
  const contrib = pipeline?.contribution ?? 0;
  const color = statusColor(contrib);
  const label = statusLabel(contrib, isActive);

  return (
    <div className="flex items-stretch gap-3">
      {/* Index bubble */}
      <div className="flex flex-col items-center justify-center">
        <div
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold font-mono transition-all duration-200 shadow-2xs",
            isActive
              ? "border-blue-500 bg-blue-600 text-white"
              : "border-slate-200 bg-slate-100 text-slate-600",
          )}
        >
          {stage.num}
        </div>
      </div>

      {/* Card */}
      <button
        onClick={onClick}
        className={cn(
          "flex-1 rounded-xl border p-3.5 text-left transition-all duration-200 shadow-2xs",
          isActive
            ? "border-blue-500 bg-blue-50/60 shadow-xs"
            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className={cn("font-mono text-xs font-bold", isActive ? "text-blue-700" : "text-slate-400")}>
              STAGE {stage.num}
            </div>
            <div className={cn("text-xs font-bold mt-0.5", isActive ? "text-slate-900" : "text-slate-700")}>
              {stage.name}
            </div>
            <div className="font-mono text-[10px] text-slate-400 mt-0.5">Port :{stage.port} · {stage.latency}</div>
          </div>
          <div className="text-right">
            <div className="font-mono text-[10px] font-bold uppercase tracking-wider" style={{ color }}>
              {label}
            </div>
            <div className={cn("font-mono text-[11px] font-bold mt-0.5", contrib > 0 ? "text-amber-700" : "text-emerald-700")}>
              Risk {contrib > 0 ? `+${contrib}` : "+0"}
            </div>
          </div>
        </div>
      </button>
    </div>
  );
}

// ─── Stage detail panel ──────────────────────────────────────
function StageDetailPanel({
  stageIdx, event, pipeline,
}: {
  stageIdx: number;
  event: QueryResult | null;
  pipeline?: PipelineStage;
}) {
  const meta = STAGE_META[stageIdx];
  const contrib = pipeline?.contribution ?? (stageIdx === 2 ? 45 : 0);
  const verdict = event?.verdict ?? "FLAG";
  const domain = event?.domain ?? "xq9m2kz7v4na.com";
  const clientIp = event?.client_ip ?? "10.0.12.45";
  const isML = stageIdx === 2 || stageIdx === 3;

  return (
    <div className="flex h-full flex-col border-l border-slate-200 bg-white">
      {/* Header */}
      <div className="border-b border-slate-200 px-6 py-4 bg-slate-50/60">
        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">
          INSPECTION VIEW · STAGE {meta.num}
        </div>
        <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900 font-sans">
          {meta.name}
        </h2>
      </div>

      {/* Service info strip */}
      <div className="flex items-center gap-6 border-b border-slate-200 px-6 py-3 bg-white text-xs">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-mono">Microservice</div>
          <div className="font-mono font-bold text-blue-600">{meta.service}</div>
        </div>
        <div className="h-6 w-px bg-slate-200" />
        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-mono">Port</div>
          <div className="font-mono font-semibold text-slate-700">{meta.port}</div>
        </div>
        <div className="h-6 w-px bg-slate-200" />
        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-mono">Status</div>
          <div className="flex items-center gap-1.5 font-bold text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            ACTIVE
          </div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-mono">Risk Contribution</div>
          <div className="font-mono text-base font-bold text-amber-700">+{contrib} / 100</div>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-auto">
        {/* Left col */}
        <div className="flex-1 space-y-5 border-r border-slate-200 overflow-auto p-5">
          {/* Query context */}
          <div>
            <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">
              Observed Query Context
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <table className="w-full text-xs">
                <tbody className="divide-y divide-slate-200/60">
                  {[
                    { label: "Target Domain", value: domain },
                    { label: "Query Type", value: "A Record" },
                    { label: "Client Source IP", value: clientIp },
                    { label: "Host Asset", value: "CORP-WORKSTATION-01" },
                    { label: "Timestamp", value: new Date().toLocaleTimeString("en-US", { hour12: true }) },
                  ].map((row) => (
                    <tr key={row.label}>
                      <td className="py-2 pr-3 text-slate-500 font-medium">{row.label}</td>
                      <td className={cn("py-2 font-mono text-right font-semibold", row.label === "Target Domain" ? "text-blue-700" : "text-slate-900")}>
                        {row.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Model info */}
          <div>
            <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">
              Stage Logic &amp; Decision Boundary
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700 leading-relaxed">
              <p>
                This pipeline stage calculates lexical n-gram perplexity, Shannon entropy, and homoglyph distance against authoritative datasets. Zero risk indicates standard benign enterprise conventions.
              </p>
            </div>
          </div>
        </div>

        {/* Right col */}
        <div className="w-72 shrink-0 space-y-5 overflow-auto p-5 bg-slate-50/40">
          <div>
            <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">
              Analysis Breakdown
            </div>
            <div className="space-y-3">
              {DEMO_ANALYSIS.map((item) => (
                <div key={item.label}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-slate-600">{item.label}</span>
                    <span className="font-mono font-bold text-slate-900">{item.value}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(item.value / item.max) * 100}%`,
                        background: item.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Total Pipeline Contribution</span>
            <div className="font-mono text-2xl font-bold text-amber-700 mt-1">+{contrib} pts</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Pipeline Page ──────────────────────────────────────
export default function PipelinePage() {
  const [activeStage, setActiveStage] = useState(2);
  const [latestEvent, setLatestEvent] = useState<QueryResult | null>(null);

  useEffect(() => {
    getEvents(50)
      .then((events) => {
        const flagged = events.find((e) => e.verdict === "FLAG" || e.verdict === "BLOCK");
        if (flagged) setLatestEvent(flagged);
      })
      .catch(() => {});
  }, []);

  const pipeline = latestEvent?.pipeline;

  return (
    <div className="flex h-full" style={{ height: "calc(100vh - 64px)" }}>
      {/* Left Column */}
      <div className="flex w-96 shrink-0 flex-col border-r border-slate-200 bg-slate-50/50 overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4 bg-white">
          <h1 className="text-sm font-bold uppercase tracking-wider text-slate-900 font-sans">
            7-Stage Interceptor Pipeline
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Click any engine layer to inspect real-time execution trace
          </p>
        </div>

        <div className="flex-1 space-y-2.5 overflow-auto p-4">
          {STAGE_META.map((stage, idx) => (
            <CylinderNode
              key={stage.num}
              stage={stage}
              isActive={activeStage === idx}
              onClick={() => setActiveStage(idx)}
              pipeline={pipeline?.[idx]}
            />
          ))}
        </div>
      </div>

      {/* Right Detail */}
      <div className="flex-1 overflow-hidden">
        <StageDetailPanel
          stageIdx={activeStage}
          event={latestEvent}
          pipeline={pipeline?.[activeStage]}
        />
      </div>
    </div>
  );
}
