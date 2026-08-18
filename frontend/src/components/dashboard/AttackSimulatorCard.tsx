import React from "react";
import Link from "next/link";
import { ArrowRight, Play, Zap, Loader2 } from "lucide-react";
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
    label: "Benign Lookup",
    desc: "e.g. google.com",
    badgeColor: "text-emerald-700",
    dot: "bg-emerald-500",
    hoverBorder: "hover:border-emerald-300 hover:bg-emerald-50/40",
  },
  {
    type: "dga" as const,
    label: "DGA Generation",
    desc: "High entropy string",
    badgeColor: "text-rose-700",
    dot: "bg-rose-500",
    hoverBorder: "hover:border-rose-300 hover:bg-rose-50/40",
  },
  {
    type: "typosquat" as const,
    label: "Typosquatting",
    desc: "Lookalike phishing",
    badgeColor: "text-amber-700",
    dot: "bg-amber-500",
    hoverBorder: "hover:border-amber-300 hover:bg-amber-50/40",
  },
  {
    type: "dns_tunnelling" as const,
    label: "DNS Tunnelling",
    desc: "Data exfiltration",
    badgeColor: "text-purple-700",
    dot: "bg-purple-500",
    hoverBorder: "hover:border-purple-300 hover:bg-purple-50/40",
  },
  {
    type: "c2_beaconing" as const,
    label: "C2 Beaconing",
    desc: "Periodic bot signal",
    badgeColor: "text-red-700",
    dot: "bg-red-500",
    hoverBorder: "hover:border-red-300 hover:bg-red-50/40",
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
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600 border border-amber-200">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono block">
              VERIFICATION ENGINE
            </span>
            <h2 className="text-sm font-bold text-slate-900 leading-tight">
              Live Attack Simulator &amp; Test Harness
            </h2>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Trigger synthetic attack payloads to verify real-time classification across all 7 pipeline stages.
        </p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {simulatorPayloads.map(({ type, label, desc, badgeColor, dot, hoverBorder }) => (
          <button
            key={type}
            type="button"
            disabled={simulating !== null}
            onClick={() => onSimulate(type)}
            className={cn(
              "group flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-left transition-all duration-200 shadow-2xs hover:shadow-xs",
              hoverBorder,
              simulating === type && "border-blue-400 bg-blue-50/60 cursor-wait",
              simulating !== null && simulating !== type && "opacity-60",
            )}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-1.5">
                <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dot)} />
                <span className={cn("text-xs font-bold", badgeColor)}>{label}</span>
              </div>
              {simulating === type ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
              ) : (
                <Play className="h-3 w-3 text-slate-400 group-hover:text-slate-700 transition" />
              )}
            </div>
            <p className="mt-2 text-[11px] text-slate-500 font-mono">{desc}</p>
          </button>
        ))}
      </div>

      {simulationResult && (
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50/60 p-4 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-bold text-blue-950">Latest Evaluation:</span>
            <code className="rounded-md bg-white px-2.5 py-1 font-mono font-bold text-slate-900 border border-slate-200 shadow-2xs">
              {simulationResult.domain}
            </code>
            <VerdictBadge verdict={simulationResult.verdict} />
            <span className="text-slate-600 font-medium">
              Risk Score: <strong className="text-slate-900 font-mono font-bold">{simulationResult.risk_score}/100</strong>
            </span>
          </div>
          <Link
            href={`/app/domain?d=${encodeURIComponent(simulationResult.domain)}`}
            className="font-bold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 shrink-0 transition-colors"
          >
            Inspect XAI Dossier <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}
    </div>
  );
}
