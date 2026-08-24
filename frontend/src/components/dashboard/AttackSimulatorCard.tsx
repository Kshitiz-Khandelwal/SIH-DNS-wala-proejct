"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Zap, Loader2, Play } from "lucide-react";
import { VerdictBadge } from "@/components/VerdictBadge";
import type { QueryResult, SimulatorType } from "@/lib/types";
import { cn } from "@/lib/utils";

interface AttackSimulatorCardProps {
  simulating: SimulatorType | null;
  simulationResult: QueryResult | null;
  onSimulate: (type: SimulatorType) => void;
}

const simulatorPayloads = [
  {
    type: "benign" as const,
    label: "Sovereign Whitelist",
    desc: "e.g. isro.gov.in",
    dot: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]",
  },
  {
    type: "dga" as const,
    label: "DGA Generation",
    desc: "High Shannon Entropy",
    dot: "bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.8)]",
  },
  {
    type: "typosquat" as const,
    label: "Typosquat Phish",
    desc: "Lookalike Homoglyph",
    dot: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]",
  },
  {
    type: "dns_tunnelling" as const,
    label: "DNS Tunnelling",
    desc: "Base64 Egress Stream",
    dot: "bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.8)]",
  },
  {
    type: "c2_beaconing" as const,
    label: "C2 Beaconing",
    desc: "Cobalt Strike Heartbeat",
    dot: "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]",
  },
];

export function AttackSimulatorCard({
  simulating,
  simulationResult,
  onSimulate,
}: AttackSimulatorCardProps) {
  return (
    <div className="rounded-xl border border-slate-800/80 bg-[#0e1424] p-6 shadow-xl">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-xs">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
              REDPACKET INJECTOR
            </span>
            <h2 className="text-sm font-bold text-slate-100 leading-tight">
              Live Synthetic Attack Simulator Harness
            </h2>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Trigger real-time synthetic DNS payloads to test sub-millisecond classification across all 7 pipeline stages.
        </p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {simulatorPayloads.map(({ type, label, desc, dot }) => (
          <motion.button
            key={type}
            type="button"
            whileTap={{ scale: 0.96 }}
            disabled={simulating !== null}
            onClick={() => onSimulate(type)}
            className={cn(
              "group flex flex-col justify-between rounded-xl border border-slate-800 bg-[#111827] p-4 text-left transition-all duration-200 shadow-md hover:border-blue-500/40 hover:bg-[#141c33]",
              simulating === type && "border-blue-400 bg-blue-950/40 cursor-wait",
              simulating !== null && simulating !== type && "opacity-50"
            )}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <span className={cn("h-2 w-2 rounded-full shrink-0", dot)} />
                <span className="text-xs font-bold text-slate-200 group-hover:text-blue-400 transition-colors">
                  {label}
                </span>
              </div>
              {simulating === type ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-400" />
              ) : (
                <Play className="h-3 w-3 text-slate-500 group-hover:text-blue-400 transition-colors" />
              )}
            </div>
            <span className="text-[10px] font-mono text-slate-400 mt-3">{desc}</span>
          </motion.button>
        ))}
      </div>

      {/* Result Display Box */}
      {simulationResult && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 rounded-xl bg-[#111827] border border-slate-800 flex items-center justify-between text-xs font-mono"
        >
          <div className="flex items-center gap-3">
            <span className="text-slate-400">Target FQDN:</span>
            <span className="font-bold text-slate-100">{simulationResult.domain}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-400">Score: {simulationResult.risk_score}/100</span>
            <VerdictBadge verdict={simulationResult.verdict} />
          </div>
        </motion.div>
      )}
    </div>
  );
}
