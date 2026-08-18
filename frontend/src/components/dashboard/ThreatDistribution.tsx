import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    label: "DGA Domains",
    percent: "35%",
    segments: [
      { w: "40%", c: "bg-blue-500" },
      { w: "35%", c: "bg-amber-400" },
      { w: "15%", c: "bg-rose-500" },
      { w: "10%", c: "bg-slate-200" },
    ],
  },
  {
    label: "Homoglyph Phishing",
    percent: "25%",
    segments: [
      { w: "50%", c: "bg-blue-500" },
      { w: "30%", c: "bg-amber-400" },
      { w: "20%", c: "bg-slate-200" },
    ],
  },
  {
    label: "Data Exfiltration",
    percent: "15%",
    segments: [
      { w: "30%", c: "bg-blue-500" },
      { w: "25%", c: "bg-amber-400" },
      { w: "20%", c: "bg-rose-500" },
      { w: "25%", c: "bg-slate-200" },
    ],
  },
];

export function ThreatDistribution({ data = defaultThreats }: { data?: ThreatBarItem[] }) {
  return (
    <Card className="rounded-xl border border-slate-200 p-6 shadow-xs bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono block">
            CLASSIFICATION
          </span>
          <h2 className="text-sm font-bold text-slate-900 mt-0.5">Threat Distribution</h2>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
          Past 24h
        </span>
      </div>

      <div className="space-y-5">
        {data.map((item) => (
          <div key={item.label}>
            <div className="flex justify-between items-end mb-2">
              <span className="text-xs font-semibold text-slate-700">{item.label}</span>
              <span className="text-xs font-mono font-bold text-slate-900">{item.percent}</span>
            </div>
            <div className="flex h-2.5 w-full gap-0.5 rounded-full overflow-hidden bg-slate-100">
              {item.segments.map((seg, i) => (
                <div key={i} className={`h-full ${seg.c}`} style={{ width: seg.w }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
