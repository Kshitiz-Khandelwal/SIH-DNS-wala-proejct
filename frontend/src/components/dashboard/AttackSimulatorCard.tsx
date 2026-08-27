"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Zap, Loader2, Play, FlaskConical, CheckCircle2 } from "lucide-react";
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
    label: "Sovereign Allowlist",
    sublabel: "isro.gov.in",
    expectedVerdict: "ALLOW",
    tagColor: "border-emerald-200 text-emerald-800 bg-emerald-50/70",
  },
  {
    type: "dga" as const,
    label: "DGA Algorithmic",
    sublabel: "Entropy > 3.8",
    expectedVerdict: "BLOCK",
    tagColor: "border-rose-200 text-rose-800 bg-rose-50/70",
  },
  {
    type: "typosquat" as const,
    label: "Typosquat Phishing",
    sublabel: "Homoglyph spoof",
    expectedVerdict: "BLOCK",
    tagColor: "border-amber-200 text-amber-800 bg-amber-50/70",
  },
  {
    type: "dns_tunnelling" as const,
    label: "DNS Tunnelling Exfil",
    sublabel: "Base64 payload",
    expectedVerdict: "BLOCK",
    tagColor: "border-purple-200 text-purple-800 bg-purple-50/70",
  },
  {
    type: "c2_beaconing" as const,
    label: "C2 Heartbeat Beacon",
    sublabel: "Periodic interval",
    expectedVerdict: "BLOCK",
    tagColor: "border-rose-200 text-rose-800 bg-rose-50/70",
  },
];

export function AttackSimulatorCard({
  simulating,
  simulationResult,
  onSimulate,
}: AttackSimulatorCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
            <FlaskConical className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 font-sans uppercase tracking-wider">
              Controlled Synthetic Attack Injector
            </h3>
            <p className="text-[11px] text-slate-500 font-mono">
              Validate 7-stage classifier reaction &amp; sub-millisecond response latency
            </p>
          </div>
        </div>
        <span className="font-mono text-[10px] text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded w-max">
          EVALUATION HARNESS
        </span>
      </div>

      {/* Test vectors row */}
      <div className="mt-3.5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {simulatorPayloads.map((sim) => {
          const isLoading = simulating === sim.type;
          return (
            <button
              key={sim.type}
              type="button"
              disabled={simulating !== null}
              onClick={() => onSimulate(sim.type)}
              className={cn(
                "group relative flex flex-col justify-between rounded-lg border border-slate-200 bg-slate-50/40 p-3 text-left transition-all duration-150 shadow-2xs hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50 cursor-pointer active:scale-98 focus-visible:outline-2 focus-visible:outline-blue-600"
              )}
            >
              <div className="flex items-center justify-between w-full">
                <span className={cn("text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border", sim.tagColor)}>
                  {sim.expectedVerdict}
                </span>
                {isLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-600" />
                ) : (
                  <Play className="h-3 w-3 text-slate-400 group-hover:text-slate-700 transition-colors" />
                )}
              </div>
              <div className="mt-2">
                <p className="text-xs font-bold text-slate-900 leading-snug">
                  {sim.label}
                </p>
                <p className="text-[10px] font-mono text-slate-500 mt-0.5 truncate">
                  {sim.sublabel}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Real-time Injected Result Feedback */}
      {simulationResult && (
        <div className="mt-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50/50 p-3.5 font-mono text-xs shadow-2xs animate-in fade-in duration-150">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-bold text-slate-900">Evaluated:</span>
            <span className="text-slate-800 font-semibold">{simulationResult.domain}</span>
            <VerdictBadge verdict={simulationResult.verdict} glow={false} />
            <span className="text-slate-600">
              Risk: <strong className="text-slate-900">{simulationResult.risk_score}/100</strong>
            </span>
            <span className="text-slate-400">&bull;</span>
            <span className="text-slate-600 text-[11px]">
              Decided at {simulationResult.pipeline?.find((p) => p.contribution > 0)?.name || "Stage 3 ML"}
            </span>
          </div>
          <Link
            href={`/app/domain/${simulationResult.id || simulationResult.domain}`}
            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 hover:text-emerald-950 hover:underline shrink-0"
          >
            <span>View Full Pipeline Trace</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}
    </div>
  );
}
