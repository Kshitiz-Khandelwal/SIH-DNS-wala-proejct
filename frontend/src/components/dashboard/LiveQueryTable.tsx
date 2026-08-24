"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight, Search } from "lucide-react";
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
    <div className="bg-[#0e1424] rounded-xl border border-slate-800/80 shadow-xl flex flex-col overflow-hidden">
      <div className="p-4 border-b border-slate-800 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-[#111827]">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 radar-beacon" />
          Real-Time Sovereign Query Stream
        </h3>
        <div className="flex flex-wrap gap-2 items-center">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search FQDN or Client IP..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-8 w-[200px] rounded-lg border border-slate-800 bg-[#070a12] pl-8 pr-3 text-xs font-mono text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none transition"
            />
          </div>

          {/* Filter pills (Linear style) */}
          <div className="flex gap-1 bg-[#070a12] p-1 rounded-lg border border-slate-800 font-mono text-xs">
            {FILTER_PILLS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => onFilterChange(tab)}
                className={cn(
                  "px-3 py-1 rounded-md text-[10px] font-bold transition-all",
                  filter === tab
                    ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono text-xs">
          <thead>
            <tr className="bg-[#0b0f19] border-b border-slate-800 text-[10px] uppercase text-slate-400">
              <th className="px-4 py-3">Timestamp ↓</th>
              <th className="px-4 py-3">Queried Domain</th>
              <th className="px-4 py-3">Client IP</th>
              <th className="px-4 py-3">Risk Score</th>
              <th className="px-4 py-3">Verdict</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {events.length === 0 ? (
              <tr>
                <td colSpan={6} className="h-32 text-center text-xs text-slate-500 font-mono">
                  No telemetry matching the selected filter criteria.
                </td>
              </tr>
            ) : (
              events.map((ev, idx) => (
                <motion.tr
                  key={ev.id || idx}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className="hover:bg-slate-800/40 transition-colors"
                >
                  <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                    {formatTime(ev.timestamp)}
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-100">
                    <DomainCell domain={ev.domain} />
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {ev.client_ip}
                  </td>
                  <td className="px-4 py-3 font-bold">
                    <span className={cn(
                      ev.risk_score >= 70 ? "text-rose-400" : ev.risk_score >= 40 ? "text-amber-400" : "text-emerald-400"
                    )}>
                      {ev.risk_score}/100
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <VerdictBadge verdict={ev.verdict} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/app/domain?d=${encodeURIComponent(ev.domain)}`}
                      className="inline-flex items-center gap-1 text-[11px] font-mono text-blue-400 hover:text-blue-300 underline"
                    >
                      Inspect <ChevronRight className="h-3 w-3" />
                    </Link>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
