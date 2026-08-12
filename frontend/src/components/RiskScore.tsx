import { cn } from "@/lib/utils";

export function RiskScore({
  score,
  className,
  showBar = true,
}: {
  score: number;
  className?: string;
  showBar?: boolean;
}) {
  const clamped = Math.min(100, Math.max(0, score));
  const barColor =
    clamped <= 40 ? "bg-trace" : clamped <= 70 ? "bg-signal-amber" : "bg-alert";

  return (
    <div className={cn("flex min-w-[72px] items-center gap-2", className)}>
      <span className="font-mono text-sm tabular-nums text-text">{clamped}</span>
      {showBar && (
        <div className="h-1 w-12 overflow-hidden rounded-sm bg-line">
          <div
            className={cn("h-full rounded-sm transition-all duration-120", barColor)}
            style={{ width: `${clamped}%` }}
          />
        </div>
      )}
    </div>
  );
}
