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
      { w: "42%", c: "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]" },
      { w: "58%", c: "bg-slate-800" },
    ],
  },
  {
    label: "Base64 DNS Tunneling Exfil",
    percent: "31%",
    segments: [
      { w: "31%", c: "bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]" },
      { w: "69%", c: "bg-slate-800" },
    ],
  },
  {
    label: "C2 Heartbeat Beaconing",
    percent: "18%",
    segments: [
      { w: "18%", c: "bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]" },
      { w: "82%", c: "bg-slate-800" },
    ],
  },
  {
    label: "Typosquat & Phishing",
    percent: "9%",
    segments: [
      { w: "9%", c: "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" },
      { w: "91%", c: "bg-slate-800" },
    ],
  },
];

export function ThreatDistribution({ data = defaultThreats }: { data?: ThreatBarItem[] }) {
  return (
    <div className="rounded-xl border border-slate-800/80 bg-[#0e1424] p-6 shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-5">
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
            PROPORTIONAL BREAKDOWN
          </span>
          <h2 className="text-sm font-bold text-slate-100 mt-0.5">Threat Category Distribution</h2>
        </div>
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
          24h Vector
        </span>
      </div>

      <div className="space-y-4">
        {data.map((item) => (
          <div key={item.label} className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-slate-300 font-semibold">{item.label}</span>
              <span className="font-bold text-slate-100">{item.percent}</span>
            </div>
            <div className="flex h-2 w-full rounded-full overflow-hidden bg-slate-900">
              {item.segments.map((seg, i) => (
                <motion.div
                  key={i}
                  initial={{ width: 0 }}
                  animate={{ width: seg.w }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className={`h-full ${seg.c}`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
