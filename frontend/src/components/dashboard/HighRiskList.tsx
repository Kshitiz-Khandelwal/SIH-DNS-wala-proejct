"use client";

import React from "react";
import { ShieldAlert, ArrowRight } from "lucide-react";
import { VerdictBadge } from "@/components/VerdictBadge";
import type { QueryResult } from "@/lib/types";
import Link from "next/link";

export function HighRiskList({ events }: { events: QueryResult[] }) {
  return (
    <div className="rounded-xl border border-slate-800/80 bg-[#0e1424] p-6 shadow-xl flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-rose-400" />
            <h3 className="text-sm font-bold text-slate-100">Critical Threat Detections</h3>
          </div>
          <span className="text-[10px] font-mono text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 font-bold">
            Action Required
          </span>
        </div>

        <div className="divide-y divide-slate-800/60 font-mono text-xs">
          {events.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-500 font-mono">
              No critical threats detected in current monitoring window.
            </p>
          ) : (
            events.map((ev) => (
              <div key={ev.id} className="flex items-center justify-between gap-3 py-3 hover:bg-slate-800/30 transition-colors">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-slate-100" title={ev.domain}>
                    {ev.domain}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Host: <span className="text-slate-200">{ev.client_ip}</span> · Score:{" "}
                    <span className="font-bold text-rose-400">{ev.risk_score}/100</span>
                  </p>
                </div>
                <VerdictBadge verdict={ev.verdict} />
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-800 text-right">
        <Link href="/app/quarantine" className="inline-flex items-center gap-1.5 text-xs font-mono text-blue-400 hover:text-blue-300 underline">
          <span>View Quarantine Queue</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
