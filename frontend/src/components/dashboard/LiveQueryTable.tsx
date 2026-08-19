import React from "react";
import Link from "next/link";
import { ArrowRight, ChevronRight, Globe, Search } from "lucide-react";
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

const VERDICT_PILL: Record<string, string> = {
  BLOCK: "verdict-block",
  FLAG: "verdict-flag",
  ALLOW: "verdict-allow",
};

const FILTER_PILLS = ["ALL", "BLOCK", "FLAG", "ALLOW"] as const;
const FILTER_ACTIVE: Record<string, string> = {
  ALL: "bg-slate-800 text-white border-slate-800",
  BLOCK: "bg-rose-50 text-rose-700 border-rose-300",
  FLAG: "bg-amber-50 text-amber-700 border-amber-300",
  ALLOW: "bg-emerald-50 text-emerald-700 border-emerald-300",
};
const FILTER_IDLE = "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-800";

export function LiveQueryTable({
  events,
  totalCount,
  filter,
  searchQuery,
  onFilterChange,
  onSearchChange,
}: LiveQueryTableProps) {
  return (
    /* Stitch: bg-white rounded technical-border technical-shadow flex flex-col overflow-hidden */
    <div className="bg-white rounded-lg technical-border technical-shadow flex flex-col overflow-hidden">
      {/* Stitch: p-4 border-b flex justify-between items-center bg-surface-bright */}
      <div className="p-4 border-b border-slate-200/70 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-slate-50/40">
        <h3 className="text-[14px] font-semibold text-slate-900 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live Query Stream
        </h3>
        <div className="flex flex-wrap gap-2 items-center">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search domain or IP…"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-7 w-[180px] rounded-full border border-slate-200 bg-white pl-8 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-100 transition"
            />
          </div>
          {/* Stitch: filter pills */}
          <div className="flex gap-1.5">
            {FILTER_PILLS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => onFilterChange(tab)}
                className={cn(
                  "px-3 py-1 rounded-full super-heading border transition-colors",
                  filter === tab ? FILTER_ACTIVE[tab] : FILTER_IDLE,
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table — Stitch: overflow-x-auto, divide-y divide-outline-variant/30 */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {["Timestamp ↓", "Queried Domain", "Client IP", "Risk Score", "Verdict", ""].map((h) => (
                <th key={h} className="px-4 py-2.5 super-heading text-slate-400 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {events.length === 0 ? (
              <tr>
                <td colSpan={6} className="h-32 text-center text-xs text-slate-400 mono-number">
                  No queries matching the selected criteria.
                </td>
              </tr>
            ) : (
              events.map((ev) => {
                const clamped = Math.min(100, Math.max(0, ev.risk_score));
                /* Stitch: risk bar color */
                const barColor =
                  clamped <= 35 ? "bg-emerald-500" : clamped <= 70 ? "bg-amber-500" : "bg-rose-500";
                const scoreText =
                  clamped <= 35 ? "text-emerald-700" : clamped <= 70 ? "text-amber-700" : "text-rose-600";
                const pillCls = VERDICT_PILL[ev.verdict] ?? "";

                return (
                  /* Stitch: hover:bg-surface-container/30 transition-colors */
                  <tr key={ev.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-2.5 mono-number text-xs text-slate-400 whitespace-nowrap">
                      {formatTime(ev.timestamp)}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <Globe className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                        <DomainCell domain={ev.domain} maxWidth={220} />
                      </div>
                    </td>
                    <td className="px-4 py-2.5 mono-number text-xs text-slate-500">{ev.client_ip}</td>
                    <td className="px-4 py-2.5">
                      {/* Stitch: risk score inline bar */}
                      <div className="flex items-center gap-2">
                        <span className={cn("w-6 text-right mono-number text-xs font-bold", scoreText)}>
                          {clamped}
                        </span>
                        <div className="risk-bar-track">
                          <div className={cn("risk-bar-fill", barColor)} style={{ width: `${clamped}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      {/* Stitch: verdict pill */}
                      <span className={cn("px-2 py-0.5 rounded-full super-heading", pillCls)}>
                        {ev.verdict}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Link
                        href={`/app/domain?d=${encodeURIComponent(ev.domain)}`}
                        className="text-blue-600 hover:underline text-xs font-semibold flex items-center gap-1 justify-end"
                      >
                        Details <ChevronRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/40 px-4 py-3 text-xs">
        <span className="text-slate-500">
          Showing <strong className="mono-number text-slate-800">{events.length}</strong> of {totalCount} queries
        </span>
        <Link
          href="/app/queue"
          className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-800 transition-colors"
        >
          Open Full Queue <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
