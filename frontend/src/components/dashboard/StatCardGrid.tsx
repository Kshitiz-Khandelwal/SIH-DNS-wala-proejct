"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Cpu,
  Clock,
  Radio,
} from "lucide-react";
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
  systemStatus?: "PROTECTED" | "DEGRADED" | "ATTENTION";
}

export function StatCardGrid({ items, systemStatus = "PROTECTED" }: StatCardGridProps) {
  // Find specific metrics
  const cleanItem = items.find((i) => i.variant === "allow") || items[0];
  const flaggedItem = items.find((i) => i.variant === "flag") || items[1];
  const blockedItem = items.find((i) => i.variant === "block") || items[2];
  const latencyItem = items.find((i) => i.variant === "neutral") || items[3];

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
      {/* Primary Dominant Status Block (Col span 4) */}
      <div className="rounded-xl border border-emerald-200/80 bg-white p-5 shadow-2xs lg:col-span-4 flex flex-col justify-between relative overflow-hidden">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
              SYSTEM PROTECTION POSTURE
            </span>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-lg font-bold text-slate-900 tracking-tight font-display">
                Active Defense &middot; Nominal
              </h2>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
            NODE DEL-01
          </span>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-4">
          <div>
            <span className="text-[10px] font-mono text-slate-500 uppercase">Protection Rate</span>
            <p className="font-mono text-xl font-bold text-slate-900 mt-0.5">99.2%</p>
            <span className="text-[10px] text-emerald-700 font-medium">0.00% Zero-day leak</span>
          </div>
          <div>
            <span className="text-[10px] font-mono text-slate-500 uppercase">Active Engine</span>
            <p className="font-mono text-xs font-bold text-slate-800 mt-1">7-Stage Policy</p>
            <span className="text-[10px] text-slate-500 font-mono">RF-150 + TreeSHAP</span>
          </div>
        </div>
      </div>

      {/* 3 Operational Metric Tiles (Col span 8 -> 3 cols inside) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:col-span-8">
        {/* Clean Traffic */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
              CLEAN QUERIES (24H)
            </span>
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="my-2">
            <div className="font-mono text-2xl font-bold text-slate-900 tabular-nums">
              {typeof cleanItem?.value === "number" ? cleanItem.value.toLocaleString() : cleanItem?.value}
            </div>
            <span className="inline-flex items-center gap-0.5 text-[10px] font-mono font-semibold text-emerald-700 mt-0.5">
              <ArrowUpRight className="h-3 w-3" /> +4.2% corporate volume
            </span>
          </div>
          <p className="text-[10px] text-slate-500 font-mono border-t border-slate-100 pt-1.5">
            Auto-passed via Stage 1 Cache
          </p>
        </div>

        {/* Flagged Review */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
              SOC REVIEW QUEUE
            </span>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <div className="my-2">
            <div className="font-mono text-2xl font-bold text-amber-700 tabular-nums">
              {typeof flaggedItem?.value === "number" ? flaggedItem.value.toLocaleString() : flaggedItem?.value}
            </div>
            <span className="inline-flex items-center gap-0.5 text-[10px] font-mono font-semibold text-amber-700 mt-0.5">
              <ArrowUpRight className="h-3 w-3" /> +3.7% suspicious delta
            </span>
          </div>
          <p className="text-[10px] text-slate-500 font-mono border-t border-slate-100 pt-1.5">
            Awaiting threshold triage
          </p>
        </div>

        {/* Zero-Day Dropped / Latency SLA */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
              DROPPED &middot; SLA
            </span>
            <ShieldAlert className="h-4 w-4 text-rose-600" />
          </div>
          <div className="my-2 flex items-baseline justify-between">
            <div>
              <div className="font-mono text-2xl font-bold text-rose-600 tabular-nums">
                {typeof blockedItem?.value === "number" ? blockedItem.value.toLocaleString() : blockedItem?.value}
              </div>
              <span className="text-[10px] text-rose-700 font-mono font-semibold">DGA / C2 Sinkholed</span>
            </div>
            <div className="text-right">
              <div className="font-mono text-sm font-bold text-slate-900">1.42ms</div>
              <span className="text-[9px] font-mono bg-emerald-50 text-emerald-700 px-1 py-0.5 rounded font-bold border border-emerald-200">
                P99 SLA
              </span>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 font-mono border-t border-slate-100 pt-1.5">
            0.0.0.0 Sinkhole response
          </p>
        </div>
      </div>
    </div>
  );
}
