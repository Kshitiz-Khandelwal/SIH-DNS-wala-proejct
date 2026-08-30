"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, Zap, Loader2, Play, Search, ShieldCheck, AlertTriangle, ShieldX, Sparkles, CheckCircle2 } from "lucide-react";
import { VerdictBadge } from "@/components/VerdictBadge";
import type { QueryResult, SimulatorType } from "@/lib/types";
import { cn } from "@/lib/utils";

interface AttackSimulatorCardProps {
  simulating: SimulatorType | null;
  simulationResult: QueryResult | null;
  onSimulate: (type: SimulatorType) => void;
  onCustomQuery?: (domain: string) => Promise<void>;
  isCustomQuerying?: boolean;
}

const simulatorPayloads = [
  {
    type: "benign" as const,
    label: "Sovereign Whitelist",
    desc: "isro.gov.in (0% FPR)",
    dot: "bg-emerald-500",
    pill: "bg-emerald-50 text-emerald-700 border-emerald-200",
    hoverBorder: "hover:border-emerald-300 hover:bg-emerald-50/40",
  },
  {
    type: "dga" as const,
    label: "DGA Generation",
    desc: "xq9m2kz7v4naplq.top",
    dot: "bg-rose-500",
    pill: "bg-rose-50 text-rose-700 border-rose-200",
    hoverBorder: "hover:border-rose-300 hover:bg-rose-50/40",
  },
  {
    type: "typosquat" as const,
    label: "Typosquat Phish",
    desc: "rnicrosoft.com ('rn' vs 'm')",
    dot: "bg-amber-500",
    pill: "bg-amber-50 text-amber-700 border-amber-200",
    hoverBorder: "hover:border-amber-300 hover:bg-amber-50/40",
  },
  {
    type: "dns_tunnelling" as const,
    label: "DNS Tunnelling",
    desc: "YWJjZDEy.attacker-c2.net",
    dot: "bg-purple-500",
    pill: "bg-purple-50 text-purple-700 border-purple-200",
    hoverBorder: "hover:border-purple-300 hover:bg-purple-50/40",
  },
  {
    type: "c2_beaconing" as const,
    label: "C2 Beaconing",
    desc: "xkq982-c2-beacon.ru",
    dot: "bg-rose-600",
    pill: "bg-rose-50 text-rose-700 border-rose-200",
    hoverBorder: "hover:border-rose-400 hover:bg-rose-50/40",
  },
];

export function AttackSimulatorCard({
  simulating,
  simulationResult,
  onSimulate,
  onCustomQuery,
  isCustomQuerying = false,
}: AttackSimulatorCardProps) {
  const [customDomain, setCustomDomain] = useState("");

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customDomain.trim() || !onCustomQuery) return;
    await onCustomQuery(customDomain.trim());
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block leading-none">
              LIVE INFERENCE HARNESS
            </span>
            <h2 className="text-sm font-bold text-slate-900 mt-1 font-sans">
              Domain Threat Classifier &amp; Attack Simulator
            </h2>
          </div>
        </div>
        <p className="text-xs text-slate-500 font-mono hidden md:block">
          Evaluated live via Python Random Forest ML (Port 8081 / 8001)
        </p>
      </div>

      {/* Interactive Custom Domain Scanner Bar */}
      <form onSubmit={handleCustomSubmit} className="mt-4 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={customDomain}
            onChange={(e) => setCustomDomain(e.target.value)}
            placeholder="Type any target domain to evaluate (e.g. rnicrosoft.com, isro.gov.in, malware-dga.top)..."
            className="w-full rounded-xl border border-slate-300 bg-slate-50/50 pl-9 pr-4 py-2.5 font-mono text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
        <button
          type="submit"
          disabled={isCustomQuerying || !customDomain.trim()}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 font-mono text-xs font-bold text-white transition-all hover:bg-slate-800 disabled:opacity-40 cursor-pointer shrink-0 shadow-xs"
        >
          {isCustomQuerying ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Evaluating…</>
          ) : (
            <><Play className="h-3.5 w-3.5 fill-current text-emerald-400" /> Evaluate Live</>
          )}
        </button>
      </form>

      {/* Quick Attack Simulator Buttons */}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {simulatorPayloads.map((sim) => {
          const isLoading = simulating === sim.type;
          return (
            <button
              key={sim.type}
              type="button"
              disabled={simulating !== null || isCustomQuerying}
              onClick={() => onSimulate(sim.type)}
              className={cn(
                "group relative flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-left transition-all duration-150 shadow-2xs hover:shadow-xs disabled:opacity-50 cursor-pointer active:scale-95",
                sim.hoverBorder
              )}
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-sans text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span className={cn("w-2 h-2 rounded-full", sim.dot)} />
                  {sim.label}
                </span>
                {isLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" />
                ) : (
                  <Play className="h-3 w-3 text-slate-400 group-hover:text-slate-800 transition-colors fill-current" />
                )}
              </div>
              <span className="font-mono text-[10px] text-slate-500 mt-1 truncate block">
                {sim.desc}
              </span>
            </button>
          );
        })}
      </div>

      {/* Live Result Output Bar (if result exists) */}
      {simulationResult && (
        <div className="mt-3.5 rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 border-b border-slate-200/70">
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-[10px] uppercase font-bold text-slate-400">Target:</span>
              <span className="font-mono text-sm font-bold text-slate-900">{simulationResult.domain}</span>
              <span className="rounded bg-slate-200/80 px-2 py-0.5 font-mono text-[10px] text-slate-700">
                IP: {simulationResult.client_ip}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 font-mono text-xs">
                <span className="text-slate-400 text-[10px] uppercase">Calculated Risk:</span>
                <span className={cn(
                  "font-bold text-sm",
                  simulationResult.risk_score >= 71 ? "text-rose-600" :
                  simulationResult.risk_score >= 41 ? "text-amber-600" : "text-emerald-600"
                )}>
                  {simulationResult.risk_score}/100
                </span>
              </div>

              <span className={cn(
                "inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 font-mono text-xs font-bold border",
                simulationResult.verdict === "BLOCK" ? "bg-rose-50 text-rose-700 border-rose-200" :
                simulationResult.verdict === "FLAG" ? "bg-amber-50 text-amber-700 border-amber-200" :
                "bg-emerald-50 text-emerald-700 border-emerald-200"
              )}>
                {simulationResult.verdict === "BLOCK" && <ShieldX className="h-3 w-3" />}
                {simulationResult.verdict === "FLAG" && <AlertTriangle className="h-3 w-3" />}
                {simulationResult.verdict === "ALLOW" && <ShieldCheck className="h-3 w-3" />}
                {simulationResult.verdict}
              </span>
            </div>
          </div>

          {/* Explanation Reasons */}
          <div className="mt-2 text-xs text-slate-700 font-sans flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[10px] uppercase font-bold text-slate-500 mr-1">Attribution:</span>
            {simulationResult.reasons && simulationResult.reasons.length > 0 ? (
              simulationResult.reasons.map((r, i) => (
                <span key={i} className="rounded-md bg-white border border-slate-200 px-2 py-0.5 font-mono text-[11px] text-slate-700">
                  {r}
                </span>
              ))
            ) : (
              <span className="font-mono text-[11px] text-emerald-700">Sovereign clean baseline</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
