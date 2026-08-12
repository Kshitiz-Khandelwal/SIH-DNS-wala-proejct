"use client";

import { useEffect, useState } from "react";
import type { LexicalChar, PipelineStage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { LexicalScan } from "./LexicalScan";

export function PipelineCascade({
  pipeline,
  lexicalChars,
  animate = true,
  className,
  compact = false,
}: {
  pipeline: PipelineStage[];
  lexicalChars?: LexicalChar[];
  animate?: boolean;
  className?: string;
  compact?: boolean;
}) {
  const reducedMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(
    reducedMotion || !animate ? pipeline.length - 1 : -1,
  );
  const [pulseIndex, setPulseIndex] = useState(-1);

  useEffect(() => {
    if (reducedMotion || !animate) {
      setActiveIndex(pipeline.length - 1);
      return;
    }
    setActiveIndex(-1);
    let stage = 0;
    const advance = () => {
      setActiveIndex(stage);
      setPulseIndex(stage);
      setTimeout(() => setPulseIndex(-1), 400);
      stage++;
      if (stage < pipeline.length) {
        setTimeout(advance, 600);
      }
    };
    const timer = setTimeout(advance, 200);
    return () => clearTimeout(timer);
  }, [pipeline, animate, reducedMotion]);

  const decidingStage = pipeline.find((s) => s.decided);

  function decisionLabel(stage: PipelineStage): string {
    if (stage.contribution >= 70) {
      return `Blocked by Stage ${stage.stage}: ${stage.name} — ${stage.reason}`;
    }
    if (stage.contribution >= 40) {
      return `Flagged by Stage ${stage.stage}: ${stage.name} — ${stage.reason}`;
    }
    return `Allowed by Stage ${stage.stage}: ${stage.name} — ${stage.reason}`;
  }

  return (
    <div className={cn("w-full", className)}>
      {decidingStage && (
        <p className="mb-3 text-xs text-muted">{decisionLabel(decidingStage)}</p>
      )}

      <div
        className={cn(
          "flex gap-1 overflow-x-auto pb-2",
          compact ? "gap-0.5" : "gap-2",
        )}
      >
        {pipeline.map((stage, idx) => {
          const isActive = idx <= activeIndex;
          const isPulsing = idx === pulseIndex;
          const isDecided = stage.decided;
          const isMl = stage.name === "ML Lexical";

          return (
            <div
              key={stage.stage}
              className={cn(
                "min-w-0 flex-1 rounded-lg border border-line bg-panel p-2 transition-all duration-120",
                compact && "p-1.5",
                isActive && "border-trace/50 bg-panel-raised",
                isDecided && isActive && "shadow-[0_0_16px_rgba(0,229,255,0.25)]",
                isPulsing && "scale-[1.02]",
              )}
            >
              <div className="flex items-center justify-between gap-1">
                <span
                  className={cn(
                    "truncate font-display text-[10px] font-semibold uppercase tracking-wide text-muted",
                    compact && "text-[9px]",
                    isActive && "text-text",
                  )}
                >
                  {stage.name}
                </span>
                {isActive && (
                  <span
                    className={cn(
                      "shrink-0 font-mono text-[10px] tabular-nums",
                      stage.contribution > 0 ? "text-alert" : "text-trace",
                    )}
                  >
                    +{stage.contribution}
                  </span>
                )}
              </div>
              {isActive && (
                <p
                  className={cn(
                    "mt-1 line-clamp-2 text-[10px] leading-tight text-muted",
                    compact && "text-[9px]",
                  )}
                >
                  {stage.reason}
                </p>
              )}
              {isMl && isActive && lexicalChars && lexicalChars.length > 0 && (
                <div className="mt-1.5 border-t border-line pt-1.5">
                  <LexicalScan
                    chars={lexicalChars}
                    animate={animate && idx === activeIndex}
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
