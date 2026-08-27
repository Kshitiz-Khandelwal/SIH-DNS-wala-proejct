"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight, Search, Activity } from "lucide-react";
import { VerdictBadge } from "@/components/VerdictBadge";
import { DomainCell } from "@/components/DomainCell";
import { formatTime } from "@/lib/utils";
import type { QueryResult } from "@/lib/types";
import { cn } from "@/lib/utils";

interface LiveQueryTableProps {
  events: QueryResult[];
  totalCount: number;
  filter: "ALL" | "BLOCK" | "FLAG" | "ALLOW";
  searchQuery: string;
  onFilterChange: (f: "ALL" | "BLOCK" | "FLAG" | "ALLOW") => void;
  onSearchChange: (q: string) => void;
}

const FILTER_PILLS = ["ALL", "BLOCK", "FLAG", "ALLOW"] as const;

export function LiveQueryTable({
  events,
  totalCount,
  filter,
  searchQuery,
  onFilterChange,
  onSearchChange,
}: LiveQueryTableProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col overflow-hidden">
      {/* Table Header Bar */}
      <div className="p-4 border-b border-slate-100 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-slate-50/40">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-sans">
              Real-Time DNS Telemetry Stream
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">
              Live inspection feed &middot; {totalCount} events in local buffer
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {/* Quick FQDN / Client Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search FQDN or IP..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-8 w-[190px] rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-xs font-mono text-slate-900 placeholder-slate-400 focus:border-slate-400 focus:outline-none shadow-2xs transition"
            />
          </div>

          {/* Verdict Filter Tabs */}
          <div className="flex gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200 font-mono text-xs">
            {FILTER_PILLS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => onFilterChange(tab)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer",
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

      {/* Telemetry rows */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 font-mono text-[10px] uppercase text-slate-400 bg-slate-50/60">
              <th className="py-2.5 px-4 font-semibold">Timestamp</th>
              <th className="py-2.5 px-4 font-semibold">Queried FQDN</th>
              <th className="py-2.5 px-4 font-semibold">Client Source</th>
              <th className="py-2.5 px-4 font-semibold">Risk Index</th>
              <th className="py-2.5 px-4 font-semibold">Policy Verdict</th>
              <th className="py-2.5 px-4 text-right font-semibold">Trace</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono text-xs">
            {events.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400 font-mono text-xs">
                  No matching telemetry records in current filter window.
                </td>
              </tr>
            ) : (
              events.map((ev, idx) => {
                const isHighRisk = ev.risk_score >= 70;
                const isMediumRisk = ev.risk_score >= 30 && ev.risk_score < 70;

                return (
                  <tr
                    key={ev.id || `${ev.domain}-${idx}`}
                    className={cn(
                      "hover:bg-slate-50/90 transition-colors",
                      idx === 0 && "animate-in fade-in slide-in-from-top-1 duration-150"
                    )}
                  >
                    <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap text-[11px]">
                      {formatTime(ev.timestamp || new Date().toISOString())}
                    </td>
                    <td className="py-2.5 px-4 max-w-[280px]">
                      <DomainCell domain={ev.domain} />
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 text-[11px] whitespace-nowrap">
                      {ev.client_ip || "10.0.0.42"}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 font-bold text-[11px] px-1.5 py-0.5 rounded",
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
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <VerdictBadge verdict={ev.verdict} glow={false} />
                    </td>
                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      <Link
                        href={`/app/domain/${ev.id || ev.domain}`}
                        className="inline-flex items-center gap-0.5 text-xs font-semibold font-mono text-slate-600 hover:text-slate-900 hover:underline"
                      >
                        <span>Inspect</span>
                        <ChevronRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
