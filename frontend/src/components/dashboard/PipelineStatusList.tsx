"use client";

import React from "react";
import Link from "next/link";
import { CheckCircle2, Layers, ArrowRight } from "lucide-react";

interface PipelineEngine {
  stage: number;
  name: string;
  latency: string;
}

const engines: PipelineEngine[] = [
  { stage: 1, name: "Redis L1 Verdict Cache & Bloom", latency: "0.04ms" },
  { stage: 2, name: "Sovereign Exact Whitelist", latency: "0.10ms" },
  { stage: 3, name: "Lexical & Shannon Entropy", latency: "0.22ms" },
  { stage: 4, name: "CERT-In & OTX Threat Feeds", latency: "0.64ms" },
  { stage: 5, name: "Bi-LSTM & TreeSHAP ML", latency: "1.12ms" },
  { stage: 6, name: "Quarantine Active Response", latency: "0.80ms" },
  { stage: 7, name: "Recursive Resolver Fallback", latency: "1.42ms" },
];

export function PipelineStatusList({ items = engines }: { items?: PipelineEngine[] }) {
  return (
    <div className="rounded-xl border border-slate-800/80 bg-[#0e1424] p-6 shadow-xl flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-blue-400" />
            <h3 className="text-sm font-bold text-slate-100">7-Stage Policy Cascade Waterfall</h3>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
            Sub-ms SLA
          </span>
        </div>

        <div className="space-y-2 font-mono text-xs">
          {items.map((s) => (
            <div
              key={s.stage}
              className="flex items-center justify-between rounded-lg border border-slate-800 bg-[#111827] px-3.5 py-2 text-xs hover:border-blue-500/30 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-[#070a12] text-[10px] font-bold text-blue-400 border border-slate-800 shrink-0">
                  {s.stage}
                </span>
                <span className="font-semibold text-slate-200 truncate">
                  {s.name}
                </span>
              </div>
              <span className="text-[10px] font-bold text-emerald-400 bg-[#070a12] px-2 py-0.5 rounded border border-slate-800">
                {s.latency}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-800 text-right">
        <Link href="/app/pipeline" className="inline-flex items-center gap-1.5 text-xs font-mono text-blue-400 hover:text-blue-300 underline">
          <span>Launch Pipeline Debugger Sandbox</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
