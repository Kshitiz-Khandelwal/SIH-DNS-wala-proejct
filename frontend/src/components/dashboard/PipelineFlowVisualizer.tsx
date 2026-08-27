"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Check, Shield, Database, Brain, Activity, Zap, Server, ShieldAlert } from "lucide-react";

export interface PipelineStageInfo {
  num: number;
  name: string;
  shortName: string;
  latency: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const PIPELINE_STAGES: PipelineStageInfo[] = [
  { num: 1, name: "Redis L1 Bloom Cache", shortName: "Cache", latency: "<0.1ms", icon: Database },
  { num: 2, name: "Sovereign Allowlist", shortName: "Allowlist", latency: "0.1ms", icon: Shield },
  { num: 3, name: "Lexical & Entropy", shortName: "Lexical", latency: "0.2ms", icon: Activity },
  { num: 4, name: "Threat Feeds (RPZ)", shortName: "Threat Intel", latency: "0.6ms", icon: Database },
  { num: 5, name: "Random Forest ML", shortName: "RF-150 ML", latency: "1.1ms", icon: Brain },
  { num: 6, name: "Quarantine Action", shortName: "Quarantine", latency: "0.8ms", icon: ShieldAlert },
  { num: 7, name: "Resolver Upstream", shortName: "Resolver", latency: "1.4ms", icon: Server },
];

interface PipelineFlowVisualizerProps {
  activeStage?: number; // 1-7
  verdict?: "ALLOW" | "FLAG" | "BLOCK" | null;
  activeDomain?: string | null;
  isProcessing?: boolean;
}

export function PipelineFlowVisualizer({
  activeStage = 5,
  verdict = "BLOCK",
  activeDomain = null,
  isProcessing = false,
}: PipelineFlowVisualizerProps) {
  const verdictColors = {
    ALLOW: { text: "text-emerald-700", bg: "bg-emerald-500", border: "border-emerald-500", badgeBg: "bg-emerald-50 text-emerald-800 border-emerald-200" },
    FLAG:  { text: "text-amber-700", bg: "bg-amber-500", border: "border-amber-500", badgeBg: "bg-amber-50 text-amber-800 border-amber-200" },
    BLOCK: { text: "text-rose-700", bg: "bg-rose-500", border: "border-rose-500", badgeBg: "bg-rose-50 text-rose-800 border-rose-200" },
  };

  const currentTheme = verdict ? verdictColors[verdict] : verdictColors.BLOCK;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 mb-3.5">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-slate-700" />
          <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-slate-900">
            7-Stage Detection &amp; Classification Pipeline
          </h3>
        </div>
        {activeDomain && (
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="text-slate-500">Active Query:</span>
            <span className="font-bold text-slate-900 truncate max-w-[200px]">{activeDomain}</span>
            {verdict && (
              <span className={cn("px-1.5 py-0.2 rounded font-bold border text-[10px]", currentTheme.badgeBg)}>
                {verdict} @ Stage {activeStage}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Stepper visualizer */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {PIPELINE_STAGES.map((s) => {
          const isDecidedHere = s.num === activeStage;
          const isTraversed = s.num <= activeStage;
          const Icon = s.icon;

          return (
            <div
              key={s.num}
              className={cn(
                "relative rounded-md border p-2.5 transition-all duration-200 flex flex-col justify-between text-left",
                isDecidedHere
                  ? `border-${verdict === "ALLOW" ? "emerald" : verdict === "FLAG" ? "amber" : "rose"}-400 bg-slate-50 ring-1 ring-slate-200 shadow-2xs`
                  : isTraversed
                  ? "border-slate-300 bg-slate-50/50"
                  : "border-slate-200 bg-white opacity-70"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold text-slate-400">
                  0{s.num}
                </span>
                <span className="font-mono text-[10px] text-slate-500">
                  {s.latency}
                </span>
              </div>

              <div className="my-2">
                <p className="text-xs font-bold text-slate-900 leading-tight">
                  {s.shortName}
                </p>
                <p className="text-[10px] text-slate-500 truncate font-sans">
                  {s.name.split(" ")[0]}
                </p>
              </div>

              <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                <Icon className="h-3 w-3 text-slate-400" />
                {isDecidedHere ? (
                  <span className={cn("h-2 w-2 rounded-full", currentTheme.bg, "animate-pulse")} />
                ) : isTraversed ? (
                  <Check className="h-3 w-3 text-slate-400" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-200" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
