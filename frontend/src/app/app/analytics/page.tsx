"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Calendar,
  Clock,
  Download,
  Filter,
  Globe,
  PieChart,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Zap,
} from "lucide-react";
import { getStats } from "@/lib/api";
import type { StatsResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TimeSeriesPoint {
  time: string;
  allowed: number;
  flagged: number;
  blocked: number;
}

const HOURLY_TRAFFIC: TimeSeriesPoint[] = [
  { time: "00:00", allowed: 480, flagged: 12, blocked: 4 },
  { time: "02:00", allowed: 320, flagged: 8, blocked: 2 },
  { time: "04:00", allowed: 290, flagged: 14, blocked: 6 },
  { time: "06:00", allowed: 610, flagged: 22, blocked: 9 },
  { time: "08:00", allowed: 1240, flagged: 45, blocked: 18 },
  { time: "10:00", allowed: 1890, flagged: 62, blocked: 24 },
  { time: "12:00", allowed: 1750, flagged: 54, blocked: 21 },
  { time: "14:00", allowed: 2100, flagged: 78, blocked: 32 },
  { time: "16:00", allowed: 1980, flagged: 60, blocked: 26 },
  { time: "18:00", allowed: 1420, flagged: 42, blocked: 16 },
  { time: "20:00", allowed: 1100, flagged: 30, blocked: 12 },
  { time: "22:00", allowed: 840, flagged: 20, blocked: 8 },
];

const TOP_TLDS = [
  { tld: ".com", share: 54, count: "6,938", risk: "Low" },
  { tld: ".top", share: 18, count: "2,312", risk: "High" },
  { tld: ".net", share: 12, count: "1,541", risk: "Low" },
  { tld: ".xyz", share: 9, count: "1,156", risk: "High" },
  { tld: ".org", share: 7, count: "898", risk: "Clean" },
];

const PROTOCOL_SPLIT = [
  { name: "Plain UDP (Port 53)", pct: 64, count: "8,223", color: "bg-blue-600" },
  { name: "DNS over HTTPS (DoH)", pct: 24, count: "3,083", color: "bg-emerald-500" },
  { name: "DNS over TLS (DoT)", pct: 12, count: "1,541", color: "bg-purple-500" },
];

const STAGE_LATENCIES = [
  { stage: "S1: Deterministic Allowlist", avg: "0.08 ms", p99: "0.14 ms", status: "Optimal" },
  { stage: "S2: Threat Intelligence Feeds", avg: "0.22 ms", p99: "0.45 ms", status: "Optimal" },
  { stage: "S3: Lexical & Entropy Scanner", avg: "0.38 ms", p99: "0.72 ms", status: "Optimal" },
  { stage: "S4: DGA Random Forest ML", avg: "1.12 ms", p99: "1.85 ms", status: "Nominal" },
  { stage: "S5: Homoglyph & Typosquat", avg: "0.84 ms", p99: "1.20 ms", status: "Nominal" },
  { stage: "S6: DNS Tunnelling Detector", avg: "1.25 ms", p99: "2.10 ms", status: "Nominal" },
  { stage: "S7: SHAP Explainability", avg: "0.92 ms", p99: "1.40 ms", status: "Nominal" },
];

export default function AnalyticsPage() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [range, setRange] = useState<"24h" | "7d" | "30d">("24h");

  useEffect(() => {
    getStats().then(setStats).catch(() => {});
  }, []);

  const maxTraffic = Math.max(...HOURLY_TRAFFIC.map((t) => t.allowed + t.flagged + t.blocked));

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl font-sans">
              Security Analytics &amp; Telemetry
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-semibold text-blue-700">
              <Activity className="h-3.5 w-3.5" /> Aggregated Live
            </span>
          </div>
          <p className="mt-1.5 text-sm text-slate-600">
            Resolution latency, query throughput, protocol adoption, and attack vector trends.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Time Range Selector */}
          <div className="flex items-center rounded-full border border-slate-200 bg-white p-1 shadow-xs">
            {(["24h", "7d", "30d"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold font-mono transition-all",
                  range === r ? "bg-slate-900 text-white shadow-2xs" : "text-slate-500 hover:text-slate-900"
                )}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => alert("Exporting DNS telemetry dataset (.csv)...")}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-all hover:bg-slate-50 hover:border-slate-300"
          >
            <Download className="h-3.5 w-3.5" />
            Export Data
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
            TOTAL 24H VOLUME
          </span>
          <div className="font-mono text-3xl font-bold text-slate-900 mt-2">
            {stats ? (stats.allowed_24h + stats.flagged_24h + stats.blocked_24h).toLocaleString() : "13,285"}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs text-slate-500">
            <span>Avg ~154 QPS</span>
            <span className="font-mono text-emerald-700 font-semibold inline-flex items-center gap-0.5">
              <ArrowUpRight className="h-3 w-3" /> +4.2%
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
            MEAN RESOLUTION LATENCY
          </span>
          <div className="font-mono text-3xl font-bold text-blue-700 mt-2">
            4.81 <span className="text-sm font-sans font-normal text-slate-500">ms</span>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs text-slate-500">
            <span>P99: 8.24 ms</span>
            <span className="font-mono text-emerald-700 font-semibold inline-flex items-center gap-0.5">
              <ArrowDownRight className="h-3 w-3" /> -0.6ms
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
            MITIGATION ACCURACY
          </span>
          <div className="font-mono text-3xl font-bold text-rose-700 mt-2">
            99.98<span className="text-sm font-sans font-normal text-slate-500">%</span>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs text-slate-500">
            <span>0 False Negatives</span>
            <span className="font-mono text-emerald-700 font-semibold">Strict SLA</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
            TRACKED CLIENT IPS
          </span>
          <div className="font-mono text-3xl font-bold text-slate-900 mt-2">
            142
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs text-slate-500">
            <span>4 Flagged Endpoints</span>
            <span className="font-mono text-amber-600 font-semibold">Review</span>
          </div>
        </div>
      </div>

      {/* Main Graph: Hourly Query Distribution */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
              HISTORICAL VOLUME
            </span>
            <h2 className="text-base font-bold text-slate-900 mt-0.5">
              Query Throughput by Verdict Category
            </h2>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium font-mono">
            <span className="inline-flex items-center gap-1.5 text-slate-600">
              <span className="h-2 w-2 rounded-full bg-blue-600" /> Clean Traffic
            </span>
            <span className="inline-flex items-center gap-1.5 text-amber-700">
              <span className="h-2 w-2 rounded-full bg-amber-500" /> Flagged
            </span>
            <span className="inline-flex items-center gap-1.5 text-rose-700">
              <span className="h-2 w-2 rounded-full bg-rose-500" /> Blocked
            </span>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="h-56 flex items-end gap-3 pt-6 pb-2 border-b border-slate-100">
          {HOURLY_TRAFFIC.map((item) => {
            const total = item.allowed + item.flagged + item.blocked;
            const heightPct = Math.round((total / maxTraffic) * 100);
            const blockedPct = (item.blocked / total) * 100;
            const flaggedPct = (item.flagged / total) * 100;

            return (
              <div key={item.time} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                <div
                  className="w-full max-w-[28px] rounded-t-md overflow-hidden flex flex-col-reverse transition-all group-hover:opacity-80 shadow-2xs"
                  style={{ height: `${Math.max(12, heightPct)}%` }}
                >
                  <div className="bg-blue-600 w-full flex-1" />
                  <div className="bg-amber-400 w-full" style={{ height: `${Math.max(2, flaggedPct)}%` }} />
                  <div className="bg-rose-500 w-full" style={{ height: `${Math.max(4, blockedPct)}%` }} />
                </div>
                <span className="font-mono text-[10px] text-slate-400">{item.time}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2-Column Split: Top TLDs + Protocol Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top TLDs Table */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
            REPRESENTATION
          </span>
          <h2 className="text-base font-bold text-slate-900 mt-0.5 mb-4">
            Top Queried Top-Level Domains (TLD)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-mono">
                  <th className="pb-2 font-medium">TLD</th>
                  <th className="pb-2 font-medium">Volume</th>
                  <th className="pb-2 font-medium">Traffic Share</th>
                  <th className="pb-2 text-right font-medium">Risk Profile</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {TOP_TLDS.map((tld) => (
                  <tr key={tld.tld} className="hover:bg-slate-50/50">
                    <td className="py-3 font-mono font-bold text-slate-900">{tld.tld}</td>
                    <td className="py-3 font-mono text-slate-600">{tld.count}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-600 rounded-full" style={{ width: `${tld.share}%` }} />
                        </div>
                        <span className="font-mono text-slate-500">{tld.share}%</span>
                      </div>
                    </td>
                    <td className="py-3 text-right">
                      <span
                        className={cn(
                          "inline-block rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold",
                          tld.risk === "High"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : tld.risk === "Clean"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                        )}
                      >
                        {tld.risk}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Protocol Split */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
              ENCRYPTION ADOPTION
            </span>
            <h2 className="text-base font-bold text-slate-900 mt-0.5 mb-4">
              Transport Protocols Distribution
            </h2>
            <div className="space-y-4">
              {PROTOCOL_SPLIT.map((p) => (
                <div key={p.name}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-medium text-slate-700">{p.name}</span>
                    <span className="font-mono font-bold text-slate-900">
                      {p.count} ({p.pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full", p.color)} style={{ width: `${p.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-xs text-emerald-800 flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-semibold">DoH &amp; DoT Interception Active</strong>
              <span>Encrypted DNS payloads are inspected through endpoint certificates before upstream forwarders.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Latency Table */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
          PERFORMANCE BENCHMARKS
        </span>
        <h2 className="text-base font-bold text-slate-900 mt-0.5 mb-4">
          Pipeline Execution Latency by Stage
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-mono">
                <th className="pb-2 font-medium">Stage Engine</th>
                <th className="pb-2 font-medium">Mean Execution</th>
                <th className="pb-2 font-medium">P99 Latency</th>
                <th className="pb-2 text-right font-medium">Health Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {STAGE_LATENCIES.map((s) => (
                <tr key={s.stage} className="hover:bg-slate-50/50">
                  <td className="py-3 font-medium text-slate-900">{s.stage}</td>
                  <td className="py-3 font-mono font-semibold text-blue-700">{s.avg}</td>
                  <td className="py-3 font-mono text-slate-600">{s.p99}</td>
                  <td className="py-3 text-right">
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
