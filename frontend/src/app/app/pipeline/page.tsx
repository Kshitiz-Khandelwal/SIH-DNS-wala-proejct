"use client";

import { useEffect, useState } from "react";
import { getEvents, getStats } from "@/lib/api";
import type { QueryResult, PipelineStage } from "@/lib/types";
import { cn } from "@/lib/utils";

// ─── Stage metadata (service names / ports from the actual project) ────────────
const STAGE_META = [
  { num: "01", name: "CACHE",           service: "redis",           port: "6379", color: "#22d3a5" },
  { num: "02", name: "THREAT INTEL",    service: "threat-intel",    port: "8003", color: "#22d3a5" },
  { num: "03", name: "ML LEXICAL",      service: "ml-inference",    port: "8000", color: "#ffb020" },
  { num: "04", name: "BEHAVIORAL",      service: "behavioral-eng.", port: "8001", color: "#22d3a5" },
  { num: "05", name: "GEO INTEL",       service: "geo-intel",       port: "8002", color: "#22d3a5" },
  { num: "06", name: "ACTIVE RESPONSE", service: "active-response", port: "8004", color: "#ff8c42" },
  { num: "07", name: "ANALYTICS STORE", service: "analytics-store", port: "8005", color: "#6b7fa0" },
];

const STATUS_LABEL: Record<string, string> = {
  "0":  "PASS",
  "45": "ACTIVE",
  "10": "LOW RISK",
  "65": "BLOCK",
};

function statusColor(contribution: number): string {
  if (contribution === 0)   return "#22d3a5";
  if (contribution >= 70)   return "#ff3b5c";
  if (contribution >= 40)   return "#ffb020";
  if (contribution >= 10)   return "#22d3a5";
  return "#6b7fa0";
}

function statusLabel(contribution: number, isActive: boolean): string {
  if (isActive)             return "ACTIVE";
  if (contribution === 0)   return "PASS";
  if (contribution >= 70)   return "BLOCK";
  if (contribution >= 40)   return "MONITOR";
  if (contribution >= 10)   return "LOW RISK";
  return "LOGGED";
}

function verdictColor(verdict: string): string {
  if (verdict === "BLOCK") return "#ff3b5c";
  if (verdict === "FLAG")  return "#ffb020";
  return "#22d3a5";
}

// ─── Feature breakdown from the ML stage ──────────────────────────────────────
const DEMO_FEATURES = [
  { name: "Entropy",            value: "3.81 / 5.0",  contribution: 22.9, bar: 76 },
  { name: "DGA Probability",    value: "0.89",         contribution: 31.2, bar: 89 },
  { name: "N-gram Rarity",      value: "0.76",         contribution: 15.2, bar: 76 },
  { name: "Length Score",       value: "15 chars",     contribution: 2.0,  bar: 30 },
  { name: "Typosquat Similarity", value: "0.12",       contribution: 1.8,  bar: 12 },
];

const DEMO_ANALYSIS = [
  { label: "DGA Probability",      value: 0.89, max: 1.0,  color: "#ff3b5c" },
  { label: "Entropy Score",        value: 3.81, max: 5.0,  color: "#ff3b5c" },
  { label: "N-gram Rarity",        value: 0.76, max: 1.0,  color: "#ff8c42" },
  { label: "Typosquat Similarity", value: 0.12, max: 1.0,  color: "#22d3a5" },
  { label: "ML Confidence",        value: 0.91, max: 1.0,  color: "#22d3a5" },
];

// ─── Cylinder node ─────────────────────────────────────────────────────────────
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
      <div className="flex flex-col items-center gap-0">
        <div
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold transition-all duration-200",
            isActive
              ? "border-[#00e5ff]/60 bg-[#00e5ff]/10 text-[#00e5ff]"
              : "border-[#1a2640] bg-[#0a0e1a] text-[#3a4d66]",
          )}
        >
          {stage.num}
        </div>
      </div>

      {/* Card */}
      <button
        onClick={onClick}
        className={cn(
          "cylinder-outer flex-1 p-3 text-left",
          isActive && "cylinder-active",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className={cn("cylinder-num font-display text-base font-bold tracking-tight", isActive ? "text-[#00e5ff]" : "text-[#3a4d66]")}>
              {stage.num}
            </div>
            <div className={cn("text-[10px] font-semibold uppercase tracking-wider mt-0.5", isActive ? "text-[#e2e8f0]" : "text-[#6b7fa0]")}>
              {stage.name}
            </div>
            <div className="text-[9px] text-[#3a4d66] mt-0.5">:{stage.port}</div>
          </div>
          <div className="text-right">
            <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color }}>
              {label}
            </div>
            <div className={cn("font-mono text-[11px] font-bold mt-0.5", contrib > 0 ? "text-[#ffb020]" : "text-[#22d3a5]")}>
              Risk {contrib > 0 ? `+${contrib}` : "+0"}
            </div>
          </div>
        </div>
        {/* Active glow bar at bottom */}
        {isActive && (
          <div className="mt-2 h-0.5 w-full rounded-full bg-gradient-to-r from-[#00e5ff]/80 via-[#00e5ff]/40 to-transparent" />
        )}
      </button>
    </div>
  );
}

// ─── Stage detail panel ────────────────────────────────────────────────────────
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
  const isML = stageIdx === 2;

  return (
    <div className="flex h-full flex-col border-l border-[#1a2640] bg-[#0a0e1a]">
      {/* Header */}
      <div className="border-b border-[#1a2640] px-6 py-4">
        <div className="text-[10px] font-bold uppercase tracking-widest text-[#6b7fa0]">STAGE {meta.num}</div>
        <h2 className="font-display mt-1 text-2xl font-bold uppercase tracking-tight text-[#e2e8f0]">
          {meta.name === "ML LEXICAL" ? "ML LEXICAL ANALYSIS" : meta.name}
        </h2>
      </div>

      {/* Service info strip */}
      <div className="flex items-center gap-6 border-b border-[#1a2640] px-6 py-3">
        <div>
          <div className="text-[9px] uppercase tracking-wider text-[#6b7fa0]">Service</div>
          <div className="font-mono text-xs text-[#00e5ff]">{meta.service}</div>
        </div>
        <div className="h-6 w-px bg-[#1a2640]" />
        <div>
          <div className="text-[9px] uppercase tracking-wider text-[#6b7fa0]">Port</div>
          <div className="font-mono text-xs text-[#e2e8f0]">{meta.port}</div>
        </div>
        <div className="h-6 w-px bg-[#1a2640]" />
        <div>
          <div className="text-[9px] uppercase tracking-wider text-[#6b7fa0]">Status</div>
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-[#22d3a5] pulse-dot" />
            <span className="text-xs font-bold text-[#22d3a5]">ACTIVE</span>
          </div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-[9px] uppercase tracking-wider text-[#6b7fa0]">Risk Contribution</div>
          <div className="font-mono text-lg font-bold text-[#ffb020]">+{contrib} / 100</div>
        </div>
      </div>

      {/* Body — two columns */}
      <div className="flex flex-1 overflow-auto">
        {/* Left col */}
        <div className="flex-1 space-y-5 border-r border-[#1a2640] overflow-auto p-5">
          {/* Query context */}
          <div>
            <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-[#6b7fa0]">Query Context</div>
            <table className="w-full">
              <tbody className="text-xs">
                {[
                  { icon: "⊕", label: "Domain",    value: domain },
                  { icon: "◈", label: "Query Type", value: "A" },
                  { icon: "⊠", label: "Source IP",  value: clientIp },
                  { icon: "⊡", label: "Device",     value: "LAPTOP-01" },
                  { icon: "◷", label: "Timestamp",  value: new Date().toLocaleTimeString("en-US", { hour12: false }) },
                ].map((row) => (
                  <tr key={row.label}>
                    <td className="py-1.5 pr-3 text-[#6b7fa0]">
                      <span className="mr-2 text-[#3a4d66]">{row.icon}</span>
                      {row.label}
                    </td>
                    <td className={cn("py-1.5 font-mono", row.label === "Domain" ? "text-[#00e5ff]" : "text-[#e2e8f0]")}>
                      {row.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Why this score */}
          {isML && (
            <div>
              <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#6b7fa0]">Why This Score?</div>
              <div className="rounded-lg border border-[#1a2640] bg-[#0e1525] p-3">
                <div className="flex gap-2">
                  <span className="mt-0.5 text-[#00e5ff] text-sm">⬡</span>
                  <p className="text-[11px] leading-relaxed text-[#8b9ab5]">
                    The domain exhibits high entropy and low dictionary-word similarity, indicating characteristics commonly associated with algorithmically generated domains (DGA). The model has high confidence in this prediction.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Model info */}
          {isML && (
            <div>
              <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#6b7fa0]">Model Information</div>
              <table className="w-full">
                <tbody className="text-[11px]">
                  {[
                    { label: "Model Name",  value: "dns-lexical-rf-v2" },
                    { label: "Model Type",  value: "Random Forest Classifier" },
                    { label: "Trained On",  value: "1.2M domains" },
                    { label: "Last Updated", value: new Date().toLocaleDateString() },
                    { label: "Version",     value: "2.0" },
                  ].map((r) => (
                    <tr key={r.label}>
                      <td className="py-1 pr-4 text-[#6b7fa0]">{r.label}</td>
                      <td className="py-1 font-mono text-[#e2e8f0]">{r.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right col */}
        <div className="w-72 shrink-0 space-y-5 overflow-auto p-5">
          {/* Analysis summary */}
          {isML && (
            <div>
              <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-[#6b7fa0]">Analysis Summary</div>
              <div className="space-y-3">
                {DEMO_ANALYSIS.map((item) => (
                  <div key={item.label}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-[11px] text-[#8b9ab5]">{item.label}</span>
                      <span className="font-mono text-[11px] font-bold text-[#e2e8f0]">{item.value}</span>
                    </div>
                    <div className="progress-bar-track">
                      <div
                        className="progress-bar-fill"
                        style={{
                          width: `${(item.value / item.max) * 100}%`,
                          background: item.color,
                          boxShadow: `0 0 6px ${item.color}60`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Feature breakdown */}
          {isML && (
            <div>
              <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#6b7fa0]">Feature Breakdown</div>
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="pb-2 text-left text-[9px] uppercase tracking-wider text-[#6b7fa0]">Feature</th>
                    <th className="pb-2 text-left text-[9px] uppercase tracking-wider text-[#6b7fa0]">Value</th>
                    <th className="pb-2 text-right text-[9px] uppercase tracking-wider text-[#6b7fa0]">Contribution</th>
                  </tr>
                </thead>
                <tbody>
                  {DEMO_FEATURES.map((f) => (
                    <tr key={f.name} className="border-t border-[#1a2640]">
                      <td className="py-1.5 text-[11px] text-[#8b9ab5]">{f.name}</td>
                      <td className="py-1.5 font-mono text-[11px] text-[#e2e8f0]">{f.value}</td>
                      <td className="py-1.5 text-right font-mono text-[11px] font-bold text-[#ffb020]">
                        +{f.contribution.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-2 flex items-center justify-between rounded-lg border border-[#1a2640] bg-[#0e1525] px-3 py-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#6b7fa0]">Stage Score</span>
                <span className="font-mono text-base font-bold text-[#ffb020]">+{contrib} / 100</span>
              </div>
            </div>
          )}

          {/* Non-ML stage summary */}
          {!isML && (
            <div className="rounded-lg border border-[#1a2640] bg-[#0e1525] p-4">
              <div className="text-[11px] text-[#6b7fa0]">{pipeline?.reason ?? "Stage passed. No threat signal detected."}</div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[11px] text-[#6b7fa0]">Stage Score</span>
                <span className="font-mono text-base font-bold text-[#22d3a5]">+0 / 100</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom verdict bar */}
      <div className="flex items-center gap-6 border-t border-[#1a2640] bg-[#0e1525] px-6 py-3">
        <div>
          <div className="text-[9px] uppercase tracking-wider text-[#6b7fa0]">Current Verdict</div>
          <div className="font-display mt-1 text-xl font-black" style={{ color: verdictColor(verdict) }}>
            {verdict}
          </div>
          <div className="text-[9px] uppercase text-[#6b7fa0]">
            {verdict === "BLOCK" ? "HIGH" : verdict === "FLAG" ? "MEDIUM" : "LOW"} CONFIDENCE
          </div>
        </div>
        <div className="h-12 w-px bg-[#1a2640]" />
        <div>
          <div className="text-[9px] uppercase tracking-wider text-[#6b7fa0]">Total Risk Score</div>
          <div className="font-mono mt-1 text-xl font-bold text-[#e2e8f0]">{event?.risk_score ?? 45} / 100</div>
          <div className="mt-1.5 h-1 w-32 rounded-full bg-[#1a2640]">
            <div
              className="h-full rounded-full"
              style={{
                width: `${event?.risk_score ?? 45}%`,
                background: verdictColor(verdict),
                boxShadow: `0 0 6px ${verdictColor(verdict)}80`,
              }}
            />
          </div>
        </div>
        <div className="h-12 w-px bg-[#1a2640]" />
        <div>
          <div className="text-[9px] uppercase tracking-wider text-[#6b7fa0]">Next Stage</div>
          <div className="mt-1 text-sm font-bold text-[#e2e8f0]">
            {stageIdx < STAGE_META.length - 1 ? STAGE_META[stageIdx + 1].name : "COMPLETE"}
          </div>
          {stageIdx < STAGE_META.length - 1 && (
            <div className="text-[9px] text-[#6b7fa0]">
              Service :{STAGE_META[stageIdx + 1].port}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function PipelinePage() {
  const [activeStage, setActiveStage] = useState(2); // ML Lexical by default
  const [latestEvent, setLatestEvent] = useState<QueryResult | null>(null);
  const [autoPlay, setAutoPlay] = useState(false);

  useEffect(() => {
    getEvents()
      .then((events) => {
        const flagged = events.find((e) => e.verdict === "FLAG" || e.verdict === "BLOCK");
        if (flagged) setLatestEvent(flagged);
      })
      .catch(() => {});
  }, []);

  // Auto-play through stages
  useEffect(() => {
    if (!autoPlay) return;
    let idx = 0;
    const id = setInterval(() => {
      setActiveStage(idx % STAGE_META.length);
      idx++;
    }, 1200);
    return () => clearInterval(id);
  }, [autoPlay]);

  const pipeline = latestEvent?.pipeline;

  return (
    <div className="flex h-full" style={{ height: "calc(100vh - 52px)" }}>
      {/* Left — Pipeline column */}
      <div className="flex w-96 shrink-0 flex-col border-r border-[#1a2640] bg-[#0a0e1a] overflow-hidden">
        {/* Header */}
        <div className="border-b border-[#1a2640] px-5 py-4">
          <h1 className="font-display text-sm font-bold uppercase tracking-widest text-[#e2e8f0]">
            7-Stage Detection Pipeline
          </h1>
          <p className="mt-1 text-[10px] text-[#6b7fa0]">
            Every DNS query is analyzed through 7 intelligent layers
          </p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => setAutoPlay((v) => !v)}
              className={cn(
                "rounded px-2 py-1 text-[9px] font-bold uppercase tracking-wider transition-colors",
                autoPlay
                  ? "bg-[#00e5ff]/15 text-[#00e5ff] border border-[#00e5ff]/30"
                  : "bg-[#0e1525] text-[#6b7fa0] border border-[#1a2640] hover:border-[#243452]",
              )}
            >
              {autoPlay ? "⏸ Stop Demo" : "▶ Auto Demo"}
            </button>
          </div>
        </div>

        {/* Stages */}
        <div className="flex-1 space-y-2 overflow-auto p-4 pb-6">
          {STAGE_META.map((stage, idx) => (
            <div key={stage.num}>
              <CylinderNode
                stage={stage}
                isActive={activeStage === idx}
                onClick={() => setActiveStage(idx)}
                pipeline={pipeline?.[idx]}
              />
              {/* Connector line */}
              {idx < STAGE_META.length - 1 && (
                <div className="ml-3.5 my-1 h-4 stage-connector" />
              )}
            </div>
          ))}
        </div>

        {/* Scroll hint */}
        <div className="border-t border-[#1a2640] px-5 py-3 text-center">
          <p className="text-[9px] uppercase tracking-widest text-[#3a4d66]">
            Click a stage to explore
          </p>
        </div>
      </div>

      {/* Right — Detail panel */}
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
