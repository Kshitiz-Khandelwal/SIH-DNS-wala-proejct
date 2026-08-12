import { cn } from "@/lib/utils";

interface KPIItem {
  label: string;
  value: string | number;
  sublabel?: string;
  accent?: "trace" | "amber" | "alert" | "muted";
}

const accentMap = {
  trace: "text-trace",
  amber: "text-signal-amber",
  alert: "text-alert",
  muted: "text-text",
};

export function KPIStrip({
  items,
  className,
}: {
  items: KPIItem[];
  className?: string;
}) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-4", className)}>
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-lg border border-line bg-panel px-4 py-3"
        >
          <p className="text-xs font-medium uppercase tracking-wider text-muted">
            {item.label}
          </p>
          <p
            className={cn(
              "mt-1 font-mono text-2xl font-medium tabular-nums",
              accentMap[item.accent ?? "muted"],
            )}
          >
            {typeof item.value === "number" ? item.value.toLocaleString() : item.value}
          </p>
          {item.sublabel && (
            <p className="mt-0.5 text-xs text-muted">{item.sublabel}</p>
          )}
        </div>
      ))}
    </div>
  );
}
