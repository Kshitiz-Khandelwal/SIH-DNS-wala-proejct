"use client";

import React from "react";
import { BarChart3 } from "lucide-react";

interface ThreatBarItem {
  label: string;
  percent: string;
  count: string;
  color: string;
}

const defaultThreats: ThreatBarItem[] = [
  {
    label: "DGA Algorithmic Queries",
    percent: "42%",
    count: "3,362",
    color: "bg-rose-500",
  },
  {
    label: "Base64 DNS Tunneling",
    percent: "31%",
    count: "2,482",
    color: "bg-purple-600",
  },
  {
    label: "C2 Heartbeat Beaconing",
    percent: "18%",
    count: "1,441",
    color: "bg-amber-500",
  },
  {
    label: "Typosquat & Homoglyph",
    percent: "9%",
    count: "722",
    color: "bg-blue-600",
  },
];

export function ThreatDistribution({ data = defaultThreats }: { data?: ThreatBarItem[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3.5">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-slate-600" />
          <h3 className="text-xs font-bold text-slate-900 font-sans uppercase tracking-wider">
            Threat Vector Distribution
          </h3>
        </div>
        <span className="text-[10px] font-mono text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded font-bold">
          24H SUMMARY
        </span>
      </div>

      <div className="space-y-3">
        {data.map((item) => (
          <div key={item.label} className="font-mono text-xs">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-slate-700 font-medium">{item.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-[10px]">{item.count}</span>
                <span className="font-bold text-slate-900">{item.percent}</span>
              </div>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                style={{ width: item.percent }}
                className={`h-full ${item.color} rounded-full transition-all duration-300`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
