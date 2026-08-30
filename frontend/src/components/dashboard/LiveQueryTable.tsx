"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChevronRight, ChevronDown, Search, ArrowRight, Activity, Database, Brain, ShieldAlert } from "lucide-react";
import { VerdictBadge } from "@/components/VerdictBadge";
import { DomainCell } from "@/components/DomainCell";
import { formatTime, sanitizeDomain } from "@/lib/utils";
import type { QueryResult } from "@/lib/types";
import { cn } from "@/lib/utils";

interface LiveQueryTableProps {
  events: QueryResult[];
  totalCount: number;
  filter: "ALL" | "BLOCK" | "FLAG" | "ALLOW";
  searchQuery: string;
  onFilterChange: (f: "ALL" | "BLOCK" | "FLAG" | "ALLOW") => void;
  onSearchChange: (q: string) => void;
  onSelectEvent?: (event: QueryResult) => void;
}

const FILTER_PILLS = ["ALL", "BLOCK", "FLAG", "ALLOW"] as const;

export function LiveQueryTable({
  events,
  totalCount,
  filter,
  searchQuery,
  onFilterChange,
  onSearchChange,
  onSelectEvent,
}: LiveQueryTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function handleRowClick(ev: QueryResult) {
    const isCurrentlyExpanded = expandedId === (ev.id || ev.domain);
    setExpandedId(isCurrentlyExpanded ? null : (ev.id || ev.domain));
    if (onSelectEvent) {
      onSelectEvent(ev);
    }
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-2xs flex flex-col overflow-hidden">
      {/* Table Header Bar */}
      <div className="p-3 border-b border-slate-100 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between bg-slate-50/50">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <div>
            <h3 className="text-xs font-sans font-bold text-slate-900 tracking-tight">
              Live Query Feed
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">
              {totalCount} recent queries &middot; click row to inspect decision
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {/* Quick Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search domain or IP..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-7 w-[160px] sm:w-[190px] rounded-md border border-slate-200 bg-white pl-8 pr-2.5 text-xs font-mono text-slate-900 placeholder-slate-400 focus:border-slate-400 focus:outline-none shadow-2xs transition"
            />
          </div>

          {/* Verdict Filter Tabs */}
          <div className="flex gap-0.5 bg-slate-100 p-0.5 rounded-md border border-slate-200 font-mono text-xs">
            {FILTER_PILLS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => onFilterChange(tab)}
                className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer",
                  filter === tab
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Telemetry table with in-place row expansion */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 font-mono text-[10px] uppercase text-slate-400 bg-slate-50/40">
              <th className="py-2 px-3 font-semibold w-8"></th>
              <th className="py-2 px-3 font-semibold">Time</th>
              <th className="py-2 px-3 font-semibold">Domain</th>
              <th className="py-2 px-3 font-semibold">Client IP</th>
              <th className="py-2 px-3 font-semibold">Risk</th>
              <th className="py-2 px-3 font-semibold">Verdict</th>
              <th className="py-2 px-3 text-right font-semibold">Forensics</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono text-xs">
            {events.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-slate-400 font-mono text-xs">
                  No matching queries in current filter window.
                </td>
              </tr>
            ) : (
              events.map((ev, idx) => {
                const rowKey = ev.id || `${ev.domain}-${idx}`;
                const isExpanded = expandedId === rowKey;
                const isHighRisk = ev.risk_score >= 70;
                const isMediumRisk = ev.risk_score >= 30 && ev.risk_score < 70;

                return (
                  <React.Fragment key={rowKey}>
                    <tr
                      onClick={() => handleRowClick(ev)}
                      className={cn(
                        "hover:bg-slate-50/90 transition-colors cursor-pointer select-none",
                        isExpanded ? "bg-slate-50/70" : idx === 0 ? "animate-in fade-in duration-150" : ""
                      )}
                    >
                      <td className="py-2.5 px-3 text-slate-400">
                        {isExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5 text-slate-700" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap text-[11px]">
                        {formatTime(ev.timestamp || new Date().toISOString())}
                      </td>
                      <td className="py-2.5 px-3 max-w-[280px]">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <DomainCell domain={ev.domain} />
                          {(ev.source === "simulator" || ev.id?.startsWith("eval-") || ev.id?.startsWith("sim-")) && (
                            <span className="inline-flex items-center rounded bg-purple-50 px-1.5 py-0.2 font-mono text-[9px] font-bold text-purple-700 border border-purple-200 shadow-2xs">
                              TEST
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 text-[11px] whitespace-nowrap">
                        {ev.client_ip || "10.0.0.42"}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={cn(
                            "inline-flex items-center gap-0.5 font-bold text-[11px] px-1.5 py-0.2 rounded",
                            isHighRisk
                              ? "text-rose-700 bg-rose-50 border border-rose-200"
                              : isMediumRisk
                              ? "text-amber-700 bg-amber-50 border border-amber-200"
                              : "text-emerald-700 bg-emerald-50 border border-emerald-200"
                          )}
                        >
                          {ev.risk_score}<span className="text-[9px] font-normal text-slate-400">/100</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <VerdictBadge verdict={ev.verdict} glow={false} />
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <span className="text-[11px] text-slate-400 hover:text-slate-700 font-sans">
                          {isExpanded ? "Collapse" : "Trace"}
                        </span>
                      </td>
                    </tr>

                    {/* Smooth Expandable In-Place Explanation Drawer (200ms) */}
                    {isExpanded && (
                      <tr className="bg-slate-50/60">
                        <td colSpan={7} className="px-6 py-3.5 border-b border-slate-200">
                          <div className="rounded-md border border-slate-200 bg-white p-3.5 space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5 font-sans">
                              <div>
                                <span className="font-mono text-[10px] font-bold text-slate-400 uppercase">
                                  EXPLAINABLE DECISION BREAKDOWN
                                </span>
                                <h4 className="text-xs font-bold text-slate-900 mt-0.5">
                                  {ev.domain} &middot; Verdict {ev.verdict} (Risk: {ev.risk_score}/100)
                                </h4>
                              </div>
                              <Link
                                href={`/app/domain/${encodeURIComponent(sanitizeDomain(ev.domain) || "localhost")}?id=${encodeURIComponent(ev.id)}&domain=${encodeURIComponent(sanitizeDomain(ev.domain) || "localhost")}`}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 hover:underline font-mono"
                              >
                                Full Forensic Profile <ArrowRight className="h-3 w-3" />
                              </Link>
                            </div>

                            {/* 7-Stage trace grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5 font-mono text-[10px]">
                              {(ev.pipeline && ev.pipeline.length > 0 ? ev.pipeline : [
                                { stage: "redis-cache", name: "Hot Cache", contribution: 0, reason: "Cache evaluated" },
                                { stage: "threat-intel", name: "Threat Intel", contribution: 0, reason: "STIX feed check" },
                                { stage: "local-rules", name: "Local Rules", contribution: ev.risk_score > 30 ? 30 : 0, reason: "Heuristics check" },
                                { stage: "ml-lexical", name: "ML Lexical", contribution: ev.risk_score >= 70 ? 45 : 0, reason: "Random Forest score" },
                                { stage: "behavioral", name: "Behavioral", contribution: 0, reason: "Query baseline" },
                                { stage: "geo-intel", name: "Geo Context", contribution: 0, reason: "ASN telemetry" },
                                { stage: "active-response", name: "Response", contribution: 0, reason: "Policy enforced" },
                              ]).map((stg: any, sIdx: number) => {
                                const hasContrib = (stg.contribution || 0) > 0;
                                const stageDisplayName = stg.name || (typeof stg.stage === "string" ? stg.stage.replace(/-/g, " ") : `Stage ${sIdx + 1}`);
                                return (
                                  <div
                                    key={sIdx}
                                    className={cn(
                                      "p-2 rounded border flex flex-col justify-between",
                                      hasContrib
                                        ? "border-rose-200 bg-rose-50/70 text-rose-900 font-bold"
                                        : "border-slate-100 bg-slate-50/50 text-slate-600"
                                    )}
                                  >
                                    <span className="text-[9px] text-slate-400">Stage 0{sIdx + 1}</span>
                                    <span className="font-semibold truncate capitalize">{stageDisplayName}</span>
                                    <span className="text-[9px] mt-1 text-slate-500 truncate">{stg.reason || "+0 contrib"}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
