"use client";

import { useEffect, useState } from "react";
import type { LexicalChar } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/useReducedMotion";

function charColor(score: number): string {
  if (score < 0.35) return "text-trace";
  if (score < 0.65) return "text-signal-amber";
  return "text-alert";
}

export function LexicalScan({
  chars,
  animate = true,
  className,
}: {
  chars: LexicalChar[];
  animate?: boolean;
  className?: string;
}) {
  const reducedMotion = useReducedMotion();
  const [visibleCount, setVisibleCount] = useState(reducedMotion || !animate ? chars.length : 0);

  useEffect(() => {
    if (reducedMotion || !animate) {
      setVisibleCount(chars.length);
      return;
    }
    setVisibleCount(0);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setVisibleCount(i);
      if (i >= chars.length) clearInterval(interval);
    }, 60);
    return () => clearInterval(interval);
  }, [chars, animate, reducedMotion]);

  return (
    <div className={cn("font-mono text-sm tracking-wide", className)}>
      {chars.slice(0, visibleCount).map((c, idx) => (
        <span key={`${c.char}-${idx}`} className={charColor(c.score)}>
          {c.char}
        </span>
      ))}
      {visibleCount < chars.length && (
        <span className="animate-pulse text-muted">▌</span>
      )}
    </div>
  );
}
