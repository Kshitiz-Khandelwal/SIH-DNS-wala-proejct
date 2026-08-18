import React from "react";
import { Flame } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface ThreatCategory {
  name: string;
  count: string;
  pct: number;
  indicatorColor: string;
}

const defaultThreats: ThreatCategory[] = [
  { name: "DGA Domain Generation", count: "3,142", pct: 44, indicatorColor: "bg-rose-500" },
  { name: "Typosquatting & Homoglyphs", count: "1,980", pct: 28, indicatorColor: "bg-amber-500" },
  { name: "DNS Data Exfiltration (Tunnel)", count: "1,120", pct: 16, indicatorColor: "bg-purple-500" },
  { name: "C2 Command & Control Beacon", count: "852", pct: 12, indicatorColor: "bg-blue-600" },
];

export function ThreatDistribution({ data = defaultThreats }: { data?: ThreatCategory[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-rose-500" />
          <CardTitle className="text-sm font-bold">Threat Distribution</CardTitle>
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Past 24h
        </span>
      </CardHeader>
      <CardContent className="space-y-4 pt-5">
        {data.map((item) => (
          <div key={item.name} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700">{item.name}</span>
              <span className="font-mono font-bold text-slate-900">
                {item.count} ({item.pct}%)
              </span>
            </div>
            <Progress
              value={item.pct}
              className="h-2"
              indicatorClassName={item.indicatorColor}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
