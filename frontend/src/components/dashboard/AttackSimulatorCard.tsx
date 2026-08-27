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
    dot: "bg-emerald-500",
    hoverBorder: "hover:border-emerald-300 hover:bg-emerald-50/40",
  },
  {
    type: "dga" as const,
    label: "DGA Generation",
    desc: "High Shannon Entropy",
    dot: "bg-rose-500",
    hoverBorder: "hover:border-rose-300 hover:bg-rose-50/40",
  },
  {
    type: "typosquat" as const,
    label: "Typosquat Phish",
    desc: "Lookalike Homoglyph",
    dot: "bg-amber-500",
    hoverBorder: "hover:border-amber-300 hover:bg-amber-50/40",
  },
  {
    type: "dns_tunnelling" as const,
    label: "DNS Tunnelling",
    desc: "Base64 Egress Stream",
    dot: "bg-purple-500",
    hoverBorder: "hover:border-purple-300 hover:bg-purple-50/40",
  },
  {
    type: "c2_beaconing" as const,
    label: "C2 Beaconing",
    desc: "Cobalt Strike Heartbeat",
    dot: "bg-rose-600",
    hoverBorder: "hover:border-rose-400 hover:bg-rose-50/40",
  },
];

export function AttackSimulatorCard({
  simulating,
  simulationResult,
  onSimulate,
}: AttackSimulatorCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600 border border-amber-200 shadow-2xs">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block leading-none">
              REDPACKET INJECTOR
            </span>
            <h2 className="text-sm font-bold text-slate-900 mt-1 font-sans">
              Live Synthetic Attack Simulator Harness
            </h2>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Trigger real-time synthetic DNS payloads to test sub-millisecond classification across all 7 pipeline stages.
        </p>
      </div>

      {/* Simulator buttons */}
      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        {simulatorPayloads.map((sim) => {
          const isLoading = simulating === sim.type;
          return (
            <button
              key={sim.type}
              type="button"
              disabled={simulating !== null}
              onClick={() => onSimulate(sim.type)}
              className={cn(
                "group relative flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 text-left transition-all duration-150 shadow-2xs hover:shadow-xs disabled:opacity-50 cursor-pointer active:scale-95",
                sim.hoverBorder
              )}
            >
              <div className="flex items-center justify-between w-full">
                <span className={cn("h-2 w-2 rounded-full", sim.dot)} />
                {isLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" />
                ) : (
                  <Play className="h-3 w-3 text-slate-400 group-hover:text-slate-700 transition-colors" />
                )}
              </div>
              <div className="mt-3">
                <p className="text-xs font-bold text-slate-900 group-hover:text-slate-900">
                  {sim.label}
                </p>
                <p className="text-[10px] font-mono text-slate-500 mt-0.5 truncate">
                  {sim.desc}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Result feedback */}
      {simulationResult && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50/70 p-4 font-mono text-xs shadow-2xs"
        >
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-bold text-blue-950">Injected:</span>
            <span className="text-slate-800 font-semibold">{simulationResult.domain}</span>
            <VerdictBadge verdict={simulationResult.verdict} glow={false} />
            <span className="text-slate-600">
              Risk: <strong className="text-slate-900">{simulationResult.risk_score}/100</strong>
            </span>
          </div>
          <Link
            href={`/app/domain/${simulationResult.id || simulationResult.domain}`}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-900 hover:underline shrink-0"
          >
            <span>Inspect Full Pipeline Trace</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </motion.div>
      )}
    </div>
  );
}
