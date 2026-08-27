"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight, Search, Radio } from "lucide-react";
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
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-slate-50/50">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 font-sans">
          <span className="w-2 h-2 rounded-full bg-emerald-500 radar-beacon" />
          Real-Time Sovereign Query Stream
        </h3>
        <div className="flex flex-wrap gap-2 items-center">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search FQDN or Client IP..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-8 w-[200px] rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-xs font-mono text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none shadow-2xs transition"
            />
          </div>

          {/* Filter pills */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 font-mono text-xs">
            {FILTER_PILLS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => onFilterChange(tab)}
                className={cn(
                  "px-3 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer",
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

      {/* Query rows */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 font-mono text-[10px] uppercase text-slate-400 bg-slate-50/30">
              <th className="py-2.5 px-4 font-semibold">Timestamp</th>
              <th className="py-2.5 px-4 font-semibold">Queried Domain</th>
              <th className="py-2.5 px-4 font-semibold">Client IP</th>
              <th className="py-2.5 px-4 font-semibold">Risk Score</th>
              <th className="py-2.5 px-4 font-semibold">Verdict</th>
              <th className="py-2.5 px-4 text-right font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {events.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400 font-mono text-xs">
                  No matching telemetry queries found.
                </td>
              </tr>
            ) : (
              events.map((ev, idx) => (
                <tr
                  key={ev.id || `${ev.domain}-${idx}`}
                  className="hover:bg-slate-50/80 transition-colors font-mono"
                >
                  <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                    {formatTime(ev.timestamp || new Date().toISOString())}
                  </td>
                  <td className="py-3 px-4">
                    <DomainCell domain={ev.domain} />
                  </td>
                  <td className="py-3 px-4 text-slate-600">{ev.client_ip || "10.0.0.42"}</td>
                  <td className="py-3 px-4">
                    <span
                      className={cn(
                        "font-bold",
                        ev.risk_score > 70
                          ? "text-rose-600"
                          : ev.risk_score > 30
                          ? "text-amber-600"
                          : "text-emerald-600"
                      )}
                    >
                      {ev.risk_score}/100
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <VerdictBadge verdict={ev.verdict} glow={false} />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      href={`/app/domain/${ev.id || ev.domain}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900 hover:underline"
                    >
                      <span>Inspect</span>
                      <ChevronRight className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
