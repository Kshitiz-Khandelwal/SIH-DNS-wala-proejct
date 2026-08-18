import type { Verdict } from "@/lib/types";
import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  ALLOW: "bg-emerald-50 text-emerald-700 border-emerald-200",
  FLAG:  "bg-amber-50  text-amber-700  border-amber-200",
  BLOCK: "bg-rose-50   text-rose-700   border-rose-200",
};

const dots: Record<string, string> = {
  ALLOW: "bg-emerald-500",
  FLAG:  "bg-amber-500",
  BLOCK: "bg-rose-500",
};

export function VerdictBadge({
  verdict,
  className,
  glow = false,
}: {
  verdict: Verdict | string;
  className?: string;
  glow?: boolean;
}) {
  const v = (verdict || "ALLOW").toUpperCase();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-semibold",
        styles[v] || "bg-slate-50 text-slate-700 border-slate-200",
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dots[v] || "bg-slate-400")} />
      {v}
    </span>
  );
}
