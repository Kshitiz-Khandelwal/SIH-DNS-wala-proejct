import React from "react";
import Link from "next/link";
import { CheckCircle2, Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PipelineEngine {
  stage: number;
  name: string;
  latency: string;
}

const engines: PipelineEngine[] = [
  { stage: 1, name: "Deterministic Allowlist", latency: "<0.1ms" },
  { stage: 2, name: "Threat Intelligence Feeds", latency: "0.2ms" },
  { stage: 3, name: "Lexical & Entropy Scanner", latency: "0.4ms" },
  { stage: 4, name: "DGA Random Forest ML", latency: "1.1ms" },
  { stage: 5, name: "Homoglyph / Typosquat Engine", latency: "0.8ms" },
  { stage: 6, name: "DNS Tunnelling Exfil Detector", latency: "1.2ms" },
  { stage: 7, name: "SHAP Explainability & Arbiter", latency: "0.9ms" },
];

export function PipelineStatusList({ items = engines }: { items?: PipelineEngine[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-blue-600" />
          <CardTitle className="text-sm font-bold">7-Stage Pipeline Engines</CardTitle>
        </div>
        <Link
          href="/app/pipeline"
          className="text-xs font-semibold text-blue-600 hover:text-blue-800"
        >
          Inspect
        </Link>
      </CardHeader>
      <CardContent className="space-y-2.5 pt-4">
        {items.map((s) => (
          <div
            key={s.stage}
            className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/70 px-3.5 py-2 text-xs"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span className="font-semibold text-slate-700 truncate">
                S{s.stage}: {s.name}
              </span>
            </div>
            <span className="font-mono text-[11px] font-semibold text-slate-500 shrink-0 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
              {s.latency}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
