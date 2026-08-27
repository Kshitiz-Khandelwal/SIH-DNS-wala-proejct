"use client";

import React from "react";
import Link from "next/link";
import { Layers, ArrowRight, CheckCircle2 } from "lucide-react";

interface PipelineEngine {
  stage: number;
  name: string;
  latency: string;
  status: "nominal" | "evaluating";
}

const engines: PipelineEngine[] = [
  { stage: 1, name: "Redis L1 Verdict Cache & Bloom", latency: "0.04ms", status: "nominal" },
  { stage: 2, name: "Sovereign Exact Allowlist", latency: "0.10ms", status: "nominal" },
  { stage: 3, name: "Lexical & Shannon Entropy Scan", latency: "0.22ms", status: "nominal" },
  { stage: 4, name: "CERT-In & Threat Intel Feeds", latency: "0.64ms", status: "nominal" },
  { stage: 5, name: "Random Forest & TreeSHAP ML", latency: "1.12ms", status: "nominal" },
  { stage: 6, name: "Quarantine Active Response", latency: "0.80ms", status: "nominal" },
  { stage: 7, name: "Recursive Resolver Fallback", latency: "1.42ms", status: "nominal" },
];

export function PipelineStatusList({ items = engines }: { items?: PipelineEngine[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-slate-700" />
            <h3 className="text-xs font-bold text-slate-900 font-sans uppercase tracking-wider">
              7-Stage Cascade Latencies
            </h3>
          </div>
          <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold">
            &le; 5.7ms P99 Total
          </span>
        </div>

        <div className="space-y-1.5 font-mono text-xs">
          {items.map((s) => (
            <div
              key={s.stage}
              className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-1.5 text-xs hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex h-4.5 w-4.5 items-center justify-center rounded bg-white text-[10px] font-bold text-slate-700 border border-slate-200 shrink-0">
                  {s.stage}
                </span>
                <span className="font-medium text-slate-700 truncate text-[11px]">
                  {s.name}
                </span>
              </div>
              <span className="text-[10px] font-bold text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                {s.latency}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 pt-2.5 border-t border-slate-100 text-right">
        <Link
          href="/app/pipeline"
          className="inline-flex items-center gap-1 text-xs font-semibold font-mono text-emerald-700 hover:text-emerald-900 hover:underline"
        >
          <span>Deep Cascade Specification</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
