"use client";

import React from "react";
import { ShieldAlert, ArrowRight } from "lucide-react";
import { VerdictBadge } from "@/components/VerdictBadge";
import type { QueryResult } from "@/lib/types";
import Link from "next/link";

export function HighRiskList({ events }: { events: QueryResult[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-rose-600" />
            <h3 className="text-sm font-bold text-slate-900 font-sans">Critical Threat Detections</h3>
          </div>
          <span className="text-[10px] font-mono text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 font-bold">
            Action Required
          </span>
        </div>

        <div className="divide-y divide-slate-100 font-mono text-xs">
          {events.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-400 font-mono">
              No critical threats detected in current monitoring window.
            </p>
          ) : (
            events.map((ev) => (
              <div key={ev.id} className="flex items-center justify-between gap-3 py-3 hover:bg-slate-50/80 transition-colors">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-slate-900" title={ev.domain}>
                    {ev.domain}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Host: <span className="text-slate-700 font-semibold">{ev.client_ip}</span> · Score:{" "}
                    <span className="font-bold text-rose-600">{ev.risk_score}/100</span>
                  </p>
                </div>
                <VerdictBadge verdict={ev.verdict} glow={false} />
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 text-right">
        <Link href="/app/quarantine" className="inline-flex items-center gap-1.5 text-xs font-semibold font-mono text-emerald-700 hover:text-emerald-900 hover:underline">
          <span>View Quarantine Queue</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
