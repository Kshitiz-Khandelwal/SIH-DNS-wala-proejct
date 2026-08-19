"use client";

import { cn } from "@/lib/utils";

interface FlowStage {
  num: string;
  shortName: string;
  contribution: number; // 0 = clean, >0 = risk contribution
}

function nodeColor(contribution: number, isActive: boolean) {
  if (isActive) return { ring: "ring-blue-200", bg: "bg-blue-600", border: "border-blue-600", text: "text-blue-700" };
  if (contribution >= 70) return { ring: "ring-red-100", bg: "bg-red-500", border: "border-red-500", text: "text-red-700" };
  if (contribution >= 40) return { ring: "ring-amber-100", bg: "bg-amber-500", border: "border-amber-500", text: "text-amber-700" };
  if (contribution > 0) return { ring: "ring-emerald-100", bg: "bg-emerald-500", border: "border-emerald-500", text: "text-emerald-700" };
  return { ring: "ring-slate-100", bg: "bg-slate-300", border: "border-slate-300", text: "text-slate-500" };
}

export function PipelineFlowStrip({
  stages,
  activeIndex,
  onSelect,
}: {
  stages: FlowStage[];
  activeIndex: number;
  onSelect: (idx: number) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block font-mono mb-5">
        LIVE CASCADE FLOW — QUERY TRAVERSAL
      </span>

      <div className="flex items-center">
        {stages.map((stage, idx) => {
          const isActive = idx === activeIndex;
          const isPast = idx < activeIndex;
          const color = nodeColor(stage.contribution, isActive);

          return (
            <div key={stage.num} className="flex flex-1 items-center last:flex-none">
              <button
                type="button"
                onClick={() => onSelect(idx)}
                className="flex flex-col items-center gap-2 shrink-0 group"
              >
                <div
                  className={cn(
                    "relative flex h-9 w-9 items-center justify-center rounded-full border-2 font-mono text-[11px] font-bold transition-all duration-300",
                    color.border,
                    isActive ? "text-white" : "bg-white",
                    isActive ? color.bg : color.text,
                    isActive && "ring-4",
                    isActive && color.ring,
                    !isActive && "group-hover:scale-110",
                  )}
                >
                  {isActive && (
                    <span className={cn("absolute inset-0 rounded-full pulse-dot", color.bg, "opacity-30")} />
                  )}
                  <span className="relative">{stage.num}</span>
                </div>
                <span
                  className={cn(
                    "text-[9px] font-mono font-semibold uppercase tracking-wide text-center max-w-[64px] leading-tight transition-colors",
                    isActive ? "text-slate-900" : "text-slate-400 group-hover:text-slate-600",
                  )}
                >
                  {stage.shortName}
                </span>
              </button>

              {idx < stages.length - 1 && (
                <div className="flex-1 h-0.5 mx-1 mb-4 rounded-full overflow-hidden bg-slate-100 relative">
                  <div
                    className={cn(
                      "absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out",
                      isPast ? "bg-emerald-400 w-full" : "bg-slate-100 w-0",
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
