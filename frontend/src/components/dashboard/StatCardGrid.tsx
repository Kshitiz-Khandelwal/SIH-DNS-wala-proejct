"use client";

import React, { useEffect, useState } from "react";
import { ShieldCheck, AlertTriangle, ShieldAlert, Activity, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StatItem {
  label: string;
  value: string | number;
  sublabel: string;
  trend?: string;
  trendDirection?: "up" | "down" | "neutral";
  variant: "allow" | "flag" | "block" | "neutral";
}

interface StatCardGridProps {
  items: StatItem[];
  hasLiveBlock?: boolean;
}

export function StatCardGrid({ items, hasLiveBlock = false }: StatCardGridProps) {
  const [flashBlock, setFlashBlock] = useState(false);

  useEffect(() => {
    if (hasLiveBlock) {
      setFlashBlock(true);
      const timer = setTimeout(() => setFlashBlock(false), 800);
      return () => clearTimeout(timer);
    }
  }, [hasLiveBlock]);

  const cleanItem = items.find((i) => i.variant === "allow") || items[0];
  const flaggedItem = items.find((i) => i.variant === "flag") || items[1];
  const blockedItem = items.find((i) => i.variant === "block") || items[2];
  const latencyItem = items.find((i) => i.variant === "neutral") || items[3];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {/* 1. 24h Query Volume */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs hover:border-slate-300 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-sans font-medium text-slate-500 uppercase tracking-wide">
            Total Query Volume (24h)
          </span>
          <ShieldCheck className="h-4 w-4 text-slate-400" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {typeof cleanItem?.value === "number" ? cleanItem.value.toLocaleString() : cleanItem?.value}
          </span>
          <span className="inline-flex items-center text-[10px] font-mono font-medium text-emerald-700">
            <ArrowUpRight className="h-3 w-3" /> +4.2%
          </span>
        </div>
        <p className="mt-1 text-[11px] text-slate-500 font-sans">
          99.2% benign corporate queries passed
        </p>
      </div>

      {/* 2. Block Rate & Zero-Days */}
      <div
        className={cn(
          "rounded-lg border bg-white p-4 shadow-2xs transition-all duration-300",
          flashBlock
            ? "border-rose-500 ring-2 ring-rose-200 bg-rose-50/20"
            : "border-slate-200 hover:border-slate-300"
        )}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-sans font-medium text-slate-500 uppercase tracking-wide">
            Zero-Day Drops (24h)
          </span>
          <ShieldAlert className="h-4 w-4 text-rose-600" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-mono text-2xl font-bold text-rose-600 tabular-nums">
            {typeof blockedItem?.value === "number" ? blockedItem.value.toLocaleString() : blockedItem?.value}
          </span>
          <span className="text-[10px] font-mono text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200 font-semibold">
            0.62% Rate
          </span>
        </div>
        <p className="mt-1 text-[11px] text-slate-500 font-sans">
          DGA, C2 tunnels &amp; typosquats dropped
        </p>
      </div>

      {/* 3. Review Queue / Flagged */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs hover:border-slate-300 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-sans font-medium text-slate-500 uppercase tracking-wide">
            SOC Review Queue
          </span>
          <AlertTriangle className="h-4 w-4 text-amber-600" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-mono text-2xl font-bold text-amber-700 tabular-nums">
            {typeof flaggedItem?.value === "number" ? flaggedItem.value.toLocaleString() : flaggedItem?.value}
          </span>
          <span className="text-[10px] font-mono text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 font-semibold">
            0.18% Triage
          </span>
        </div>
        <p className="mt-1 text-[11px] text-slate-500 font-sans">
          Heuristic checks awaiting analyst decision
        </p>
      </div>

      {/* 4. Mean Latency SLA */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs hover:border-slate-300 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-sans font-medium text-slate-500 uppercase tracking-wide">
            Pipeline Latency SLA
          </span>
          <Activity className="h-4 w-4 text-slate-400" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-mono text-2xl font-bold text-slate-900 tabular-nums">
            1.42<span className="text-sm font-sans font-normal text-slate-500">ms</span>
          </span>
          <span className="text-[10px] font-mono bg-emerald-50 text-emerald-800 px-1.5 py-0.2 rounded border border-emerald-200 font-semibold">
            P99 &lt; 5.7ms
          </span>
        </div>
        <p className="mt-1 text-[11px] text-slate-500 font-sans">
          Sub-millisecond cheap-to-expensive cascade
        </p>
      </div>
    </div>
  );
}
