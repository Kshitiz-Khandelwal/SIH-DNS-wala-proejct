"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Check, Shield, Database, Brain, Activity, Zap, Server, ShieldAlert } from "lucide-react";

export interface PipelineStageInfo {
  num: number;
  name: string;
  shortName: string;
  latency: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  lightBg: string;
  borderColor: string;
}

export const PIPELINE_STAGES: PipelineStageInfo[] = [
  { num: 1, name: "Redis L1 Bloom Cache", shortName: "Cache", latency: "<0.1ms", icon: Database, accentColor: "text-blue-600", lightBg: "bg-blue-50/60", borderColor: "border-blue-200" },
  { num: 2, name: "Sovereign Whitelist", shortName: "Whitelist", latency: "0.1ms", icon: Shield, accentColor: "text-emerald-600", lightBg: "bg-emerald-50/60", borderColor: "border-emerald-200" },
  { num: 3, name: "Lexical & Entropy", shortName: "Entropy", latency: "0.2ms", icon: Activity, accentColor: "text-cyan-600", lightBg: "bg-cyan-50/60", borderColor: "border-cyan-200" },
  { num: 4, name: "Threat Feeds (RPZ)", shortName: "Threat Intel", latency: "0.6ms", icon: Database, accentColor: "text-amber-600", lightBg: "bg-amber-50/60", borderColor: "border-amber-200" },
  { num: 5, name: "Random Forest ML", shortName: "RF-150 ML", latency: "1.1ms", icon: Brain, accentColor: "text-purple-600", lightBg: "bg-purple-50/60", borderColor: "border-purple-200" },
  { num: 6, name: "Quarantine Active", shortName: "Quarantine", latency: "0.8ms", icon: ShieldAlert, accentColor: "text-rose-600", lightBg: "bg-rose-50/60", borderColor: "border-rose-200" },
  { num: 7, name: "Resolver Upstream", shortName: "Resolver", latency: "1.4ms", icon: Server, accentColor: "text-indigo-600", lightBg: "bg-indigo-50/60", borderColor: "border-indigo-200" },
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
    ALLOW: { text: "text-emerald-700", bg: "bg-emerald-500", border: "border-emerald-500", badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    FLAG:  { text: "text-amber-700", bg: "bg-amber-500", border: "border-amber-500", badgeBg: "bg-amber-50 text-amber-700 border-amber-200" },
    BLOCK: { text: "text-rose-700", bg: "bg-rose-500", border: "border-rose-500", badgeBg: "bg-rose-50 text-rose-700 border-rose-200" },
  };

  const currentTheme = verdict ? verdictColors[verdict] : verdictColors.BLOCK;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 mb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-200 shadow-2xs">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block leading-none">
              7-STAGE CASCADE WATERFALL
            </span>
            <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-slate-900 mt-1">
              Live Detection &amp; Classification Traversal
            </h3>
          </div>
        </div>
        {activeDomain && (
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="text-slate-500">Evaluated Query:</span>
            <span className="font-bold text-slate-900 truncate max-w-[200px]">{activeDomain}</span>
            {verdict && (
              <span className={cn("px-2 py-0.5 rounded-md font-bold border text-[10px]", currentTheme.badgeBg)}>
                {verdict} @ Stage 0{activeStage}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Stepper visualizer */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        {PIPELINE_STAGES.map((s) => {
          const isDecidedHere = s.num === activeStage;
          const isTraversed = s.num <= activeStage;
          const Icon = s.icon;

          return (
            <div
              key={s.num}
              className={cn(
                "relative rounded-xl border p-3 transition-all duration-200 flex flex-col justify-between text-left shadow-2xs",
                isDecidedHere
                  ? "border-blue-400 bg-blue-50/40 ring-2 ring-blue-100 shadow-xs"
                  : isTraversed
                  ? cn(s.borderColor, s.lightBg)
                  : "border-slate-200 bg-white"
              )}
            >
              <div className="flex items-center justify-between">
                <span className={cn("font-mono text-[10px] font-bold", s.accentColor)}>
                  0{s.num}
                </span>
                <span className="font-mono text-[10px] text-slate-500 font-semibold">
                  {s.latency}
                </span>
              </div>

              <div className="my-2.5">
                <p className="text-xs font-bold text-slate-900 leading-tight">
                  {s.shortName}
                </p>
                <p className="text-[10px] text-slate-500 truncate font-sans mt-0.5">
                  {s.name.split(" ")[0]}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <Icon className={cn("h-3.5 w-3.5", s.accentColor)} />
                {isDecidedHere ? (
                  <span className={cn("h-2.5 w-2.5 rounded-full shadow-xs", currentTheme.bg, "animate-pulse")} />
                ) : isTraversed ? (
                  <Check className={cn("h-3.5 w-3.5", s.accentColor)} />
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
