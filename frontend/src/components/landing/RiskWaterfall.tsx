"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, AlertTriangle, ShieldX, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface WaterfallItem {
  stageNumber: number;
  stageName: string;
  contribution: number;
  reason: string;
  category: string;
}

interface ExampleProfile {
  id: string;
  domain: string;
  type: string;
  verdict: "ALLOW" | "FLAG" | "BLOCK";
  finalScore: number;
  stages: WaterfallItem[];
}

const EXAMPLES: ExampleProfile[] = [
  {
    id: "benign-sovereign",
    domain: "isro.gov.in",
    type: "Sovereign Asset",
    verdict: "ALLOW",
    finalScore: 0,
    stages: [
      { stageNumber: 1, stageName: "Emergency Allowlist", contribution: 0, reason: "Sovereign .gov.in root match — zero latency bypass", category: "Allowlist" },
      { stageNumber: 2, stageName: "Redis Verdict Cache", contribution: 0, reason: "Cached allowlist verdict verified", category: "Cache" },
      { stageNumber: 3, stageName: "Threat Intel (STIX)", contribution: 0, reason: "No IOC indicator match", category: "Intel" },
      { stageNumber: 4, stageName: "ML Lexical", contribution: 0, reason: "Dictionary match ('isro') + low entropy (2.81)", category: "Lexical" },
      { stageNumber: 5, stageName: "Behavioral Engine", contribution: 0, reason: "Normal baseline query volume", category: "Behavior" },
    ]
  },
  {
    id: "dga-malware",
    domain: "xq9m2kz7v4naplq.top",
    type: "DGA Botnet C2",
    verdict: "BLOCK",
    finalScore: 100,
    stages: [
      { stageNumber: 1, stageName: "Emergency Allowlist", contribution: 0, reason: "Domain not present in sovereign allowlist", category: "Allowlist" },
      { stageNumber: 2, stageName: "Threat Intel", contribution: 0, reason: "Zero-day domain string (not yet on public feed)", category: "Intel" },
      { stageNumber: 3, stageName: "Local Rules", contribution: 0, reason: "RFC syntax valid; no static filter match", category: "Rules" },
      { stageNumber: 4, stageName: "ML Lexical (RF-150)", contribution: 75, reason: "High entropy (4.21) + 8-consonant cluster + high-risk .top TLD", category: "Lexical" },
      { stageNumber: 5, stageName: "Behavioral Engine", contribution: 25, reason: "Device NXDOMAIN burst (32 queries/min) exceeds threshold", category: "Behavior" },
    ]
  },
  {
    id: "homoglyph-typosquat",
    domain: "rnicrosoft.com",
    type: "Typosquat Phish",
    verdict: "BLOCK",
    finalScore: 70,
    stages: [
      { stageNumber: 1, stageName: "Emergency Allowlist", contribution: 0, reason: "Not allowed", category: "Allowlist" },
      { stageNumber: 2, stageName: "Threat Intel", contribution: 0, reason: "Recent registration; unindexed IOC", category: "Intel" },
      { stageNumber: 3, stageName: "Local Rules", contribution: 0, reason: "Syntax clean", category: "Rules" },
      { stageNumber: 4, stageName: "ML Lexical (RF-150)", contribution: 70, reason: "Damerau-Levenshtein distance 1 to brand 'microsoft.com' + 'rn' visual homoglyph", category: "Lexical" },
      { stageNumber: 5, stageName: "Behavioral Engine", contribution: 0, reason: "First observation for this endpoint", category: "Behavior" },
    ]
  },
  {
    id: "dns-tunnelling",
    domain: "YWJjZDEyMzQ1Ng.attacker-c2.net",
    type: "DNS Tunnel Exfiltration",
    verdict: "BLOCK",
    finalScore: 90,
    stages: [
      { stageNumber: 1, stageName: "Emergency Allowlist", contribution: 0, reason: "Not allowed", category: "Allowlist" },
      { stageNumber: 2, stageName: "Threat Intel", contribution: 0, reason: "Dynamic tunnel domain", category: "Intel" },
      { stageNumber: 3, stageName: "Local Rules", contribution: 0, reason: "Syntax check ok", category: "Rules" },
      { stageNumber: 4, stageName: "ML Lexical", contribution: 40, reason: "Base64-encoded subdomain payload with high digit/char variance", category: "Lexical" },
      { stageNumber: 5, stageName: "Behavioral Engine", contribution: 50, reason: "Subdomain query burst (48 TXT records/60s) — Tunneling Confirmed", category: "Behavior" },
    ]
  }
];

export function RiskWaterfall({ className }: { className?: string }) {
  const [selectedExampleId, setSelectedExampleId] = useState<string>("dga-malware");
  const [hoveredStageIdx, setHoveredStageIdx] = useState<number | null>(null);

  const selected = EXAMPLES.find((e) => e.id === selectedExampleId) || EXAMPLES[1];

  let accumulated = 0;
  const waterfallSteps = selected.stages.map((st) => {
    const start = accumulated;
    accumulated += st.contribution;
    return {
      ...st,
      startScore: start,
      endScore: Math.min(accumulated, 100),
    };
  });

  return (
    <div className={cn("rounded-2xl border border-slate-200 bg-white p-6 shadow-sm", className)}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-slate-400">Explainable Decision Trace</span>
            <span className="rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 font-mono text-[10px] font-bold border border-emerald-200">XAI Waterfall</span>
          </div>
          <h3 className="text-lg font-bold text-slate-900 mt-1">Stage-by-Stage Risk Accumulation</h3>
          <p className="text-xs text-slate-500 mt-0.5">Every verdict is the mathematical sum of independent, inspectable detection stages.</p>
        </div>

        {/* Preset Selector Buttons */}
        <div className="flex flex-wrap gap-1.5">
          {EXAMPLES.map((ex) => (
            <button
              key={ex.id}
              type="button"
              onClick={() => setSelectedExampleId(ex.id)}
              className={cn(
                "rounded-lg px-3 py-1.5 font-mono text-xs font-medium transition-all cursor-pointer border",
                selected.id === ex.id
                  ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              )}
            >
              {ex.type}
            </button>
          ))}
        </div>
      </div>

      {/* Target Domain Summary Bar */}
      <div className="my-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 border border-slate-200 p-4">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400 block">Evaluated Domain</span>
          <span className="font-mono text-sm font-bold text-slate-900">{selected.domain}</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400 block">Final Risk Score</span>
            <span className={cn(
              "font-mono text-base font-bold",
              selected.finalScore >= 71 ? "text-rose-600" : selected.finalScore >= 41 ? "text-amber-600" : "text-emerald-600"
            )}>
              {selected.finalScore} / 100
            </span>
          </div>

          <div className={cn(
            "flex items-center gap-1.5 rounded-lg px-3 py-1 font-mono text-xs font-bold border",
            selected.verdict === "BLOCK" ? "bg-rose-50 text-rose-700 border-rose-200" :
            selected.verdict === "FLAG" ? "bg-amber-50 text-amber-700 border-amber-200" :
            "bg-emerald-50 text-emerald-700 border-emerald-200"
          )}>
            {selected.verdict === "BLOCK" && <ShieldX className="h-3.5 w-3.5" />}
            {selected.verdict === "FLAG" && <AlertTriangle className="h-3.5 w-3.5" />}
            {selected.verdict === "ALLOW" && <ShieldCheck className="h-3.5 w-3.5" />}
            {selected.verdict}
          </div>
        </div>
      </div>

      {/* Waterfall Visualization Bars */}
      <div className="space-y-4">
        {/* Scale Legend & Threshold markers */}
        <div className="relative pt-2 pb-1">
          <div className="flex justify-between font-mono text-[10px] text-slate-400">
            <span>0 (Clean)</span>
            <span className="text-amber-600 font-semibold">41 (FLAG Threshold)</span>
            <span className="text-rose-600 font-semibold">71 (BLOCK Threshold)</span>
            <span>100</span>
          </div>
          <div className="relative h-1.5 w-full bg-slate-100 rounded-full mt-1">
            <div className="absolute top-0 bottom-0 left-[41%] w-0.5 bg-amber-400" />
            <div className="absolute top-0 bottom-0 left-[71%] w-0.5 bg-rose-500" />
          </div>
        </div>

        {/* Stage Bars */}
        <div className="space-y-2">
          {waterfallSteps.map((step, idx) => {
            const isHovered = hoveredStageIdx === idx;
            const delta = step.contribution;

            return (
              <motion.div
                key={step.stageName}
                onMouseEnter={() => setHoveredStageIdx(idx)}
                onMouseLeave={() => setHoveredStageIdx(null)}
                className={cn(
                  "group rounded-xl border p-3 transition-all duration-200 cursor-default",
                  isHovered ? "border-emerald-300 bg-emerald-50/30 shadow-xs" : "border-slate-200 bg-white"
                )}
                layout
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 font-mono text-[10px] font-bold text-slate-600">
                      S{step.stageNumber}
                    </span>
                    <div>
                      <span className="font-semibold text-xs text-slate-900">{step.stageName}</span>
                      <span className="ml-2 font-mono text-[10px] text-slate-400 uppercase">({step.category})</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "font-mono text-xs font-bold",
                      delta > 0 ? "text-rose-600" : "text-slate-400"
                    )}>
                      {delta > 0 ? `+${delta} pts` : "0 pts"}
                    </span>
                    <span className="font-mono text-xs font-semibold text-slate-700 w-16 text-right">
                      Sum: {step.endScore}
                    </span>
                  </div>
                </div>

                {/* Progress Bar with Offset */}
                <div className="mt-2.5 relative h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  {delta > 0 && (
                    <motion.div
                      className={cn(
                        "absolute top-0 bottom-0 rounded-full",
                        step.endScore >= 71 ? "bg-rose-500" : step.endScore >= 41 ? "bg-amber-500" : "bg-emerald-500"
                      )}
                      initial={{ left: `${step.startScore}%`, width: "0%" }}
                      animate={{ left: `${step.startScore}%`, width: `${delta}%` }}
                      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    />
                  )}
                  {delta === 0 && (
                    <div
                      className="absolute top-0 bottom-0 left-0 bg-emerald-400 rounded-full"
                      style={{ width: "2px" }}
                    />
                  )}
                </div>

                {/* Reason Trace Text */}
                <p className="mt-2 text-xs text-slate-600 leading-relaxed font-sans">
                  {step.reason}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
