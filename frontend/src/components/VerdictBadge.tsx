import type { Verdict } from "@/lib/types";
import { cn } from "@/lib/utils";

const styles: Record<Verdict, string> = {
  ALLOW: "bg-trace/15 text-trace border-trace/40 shadow-[0_0_12px_rgba(0,229,255,0.35)]",
  FLAG: "bg-signal-amber/15 text-signal-amber border-signal-amber/40 shadow-[0_0_12px_rgba(255,176,32,0.35)]",
  BLOCK: "bg-alert/15 text-alert border-alert/40 shadow-[0_0_12px_rgba(255,59,92,0.35)]",
};

export function VerdictBadge({
  verdict,
  className,
  glow = true,
}: {
  verdict: Verdict;
  className?: string;
  glow?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-xs font-medium tracking-wide",
        styles[verdict],
        !glow && "shadow-none",
        className,
      )}
    >
      {verdict}
    </span>
  );
}
