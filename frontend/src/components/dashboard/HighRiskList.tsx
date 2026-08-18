import React from "react";
import { ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VerdictBadge } from "@/components/VerdictBadge";
import type { QueryResult } from "@/lib/types";

export function HighRiskList({ events }: { events: QueryResult[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-rose-500" />
          <CardTitle className="text-sm font-bold">Recent High Risk Detections</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="divide-y divide-slate-100 pt-2">
        {events.length === 0 ? (
          <p className="py-6 text-center text-xs font-medium text-slate-400">
            No critical threats detected in current window.
          </p>
        ) : (
          events.map((ev) => (
            <div key={ev.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-xs font-semibold text-slate-900" title={ev.domain}>
                  {ev.domain}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Client: <span className="font-mono">{ev.client_ip}</span> · Risk:{" "}
                  <span className="font-mono font-bold text-rose-600">{ev.risk_score}</span>
                </p>
              </div>
              <VerdictBadge verdict={ev.verdict} />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
