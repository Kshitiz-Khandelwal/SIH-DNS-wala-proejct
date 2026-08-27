"use client";

import React from "react";
import { motion } from "framer-motion";

interface ThreatSegment {
  w: string;
  c: string;
}

interface ThreatBarItem {
  label: string;
  percent: string;
  segments: ThreatSegment[];
}

const defaultThreats: ThreatBarItem[] = [
  {
    label: "DGA Domain Seed Queries",
    percent: "42%",
    segments: [
      { w: "42%", c: "bg-rose-500" },
      { w: "58%", c: "bg-slate-100" },
    ],
  },
  {
    label: "Base64 DNS Tunneling Exfil",
    percent: "31%",
    segments: [
      { w: "31%", c: "bg-purple-500" },
      { w: "69%", c: "bg-slate-100" },
    ],
  },
  {
    label: "C2 Heartbeat Beaconing",
    percent: "18%",
    segments: [
      { w: "18%", c: "bg-amber-500" },
      { w: "82%", c: "bg-slate-100" },
    ],
  },
  {
    label: "Typosquat & Phishing",
    percent: "9%",
    segments: [
      { w: "9%", c: "bg-blue-500" },
      { w: "91%", c: "bg-slate-100" },
    ],
  },
];

export function ThreatDistribution({ data = defaultThreats }: { data?: ThreatBarItem[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
            PROPORTIONAL BREAKDOWN
          </span>
          <h2 className="text-sm font-bold text-slate-900 mt-0.5 font-sans">Threat Category Distribution</h2>
        </div>
        <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-bold border border-slate-200">
          24H VECTOR
        </span>
      </div>

      <div className="space-y-4">
        {data.map((item) => (
          <div key={item.label}>
            <div className="flex justify-between text-xs font-mono mb-1.5">
              <span className="text-slate-700 font-semibold">{item.label}</span>
              <span className="font-bold text-slate-900">{item.percent}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100 flex overflow-hidden border border-slate-200/60">
              {item.segments.map((seg, idx) => (
                <div
                  key={idx}
                  style={{ width: seg.w }}
                  className={`h-full ${seg.c} transition-all duration-500`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
