import React from "react";
import {
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface StatItem {
  label: string;
  value: string | number;
  sublabel: string;
  trend?: string;
  trendDirection?: "up" | "down" | "neutral";
  variant: "allow" | "flag" | "block" | "neutral";
}

const iconMap = {
  allow: ShieldCheck,
  flag: AlertTriangle,
  block: ShieldAlert,
  neutral: Activity,
};

/* Stitch: top-stripe colors translated from Stitch tokens */
const topAccentLine = {
  allow: "bg-emerald-500",   // Stitch: bg-secondary
  flag: "bg-amber-400",      // Stitch: bg-tertiary-fixed-dim
  block: "bg-rose-500",      // Stitch: bg-error
  neutral: "bg-blue-600",    // Stitch: bg-primary
};

const metricTextColor = {
  allow: "text-emerald-700",
  flag: "text-amber-700",
  block: "text-rose-600",
  neutral: "text-slate-900",
};

/* Stitch trend badge: bg-secondary-container/20 text-secondary (allow), bg-error/10 text-error (block) */
function getTrendBadgeClass(variant: StatItem["variant"], dir?: string) {
  if (variant === "allow" || variant === "neutral") {
    return dir === "down"
      ? "bg-rose-50 text-rose-700 border-rose-200"
      : "bg-emerald-50/70 text-emerald-700 border-emerald-200";
  }
  if (variant === "flag") {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }
  // block: down is good, up is bad
  return dir === "down"
    ? "bg-emerald-50/70 text-emerald-700 border-emerald-200"
    : "bg-rose-50 text-rose-700 border-rose-200";
}

export function StatCardGrid({ items }: { items: StatItem[] }) {
  return (
    /* Stitch: grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 */
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => {
        const Icon = iconMap[item.variant] || Activity;
        const badgeCls = getTrendBadgeClass(item.variant, item.trendDirection);

        return (
          <div
            key={item.label}
            /* Stitch: bg-white rounded technical-border technical-shadow relative overflow-hidden flex flex-col p-4 group hover:bg-surface-bright */
            className="group relative overflow-hidden rounded-lg bg-white technical-border technical-shadow flex flex-col p-4 transition-colors hover:bg-slate-50"
          >
            {/* Stitch: absolute top-0 h-1 w-full accent stripe with enter animation */}
            <div className={cn("absolute top-0 left-0 right-0 h-1 accent-stripe", topAccentLine[item.variant])} />

            {/* Stitch: flex justify-between items-start mb-2 */}
            <div className="flex justify-between items-start mb-3 mt-1">
              <span className="super-heading text-slate-400">{item.label}</span>
              <Icon className={cn("h-4.5 w-4.5 shrink-0", metricTextColor[item.variant])} style={{height: "18px", width: "18px"}} />
            </div>

            {/* Stitch: text-display-lg mono-number mt-auto */}
            <div className="flex items-baseline gap-2 mt-auto">
              <span className={cn("mono-number text-[28px] font-bold tracking-tight leading-none", metricTextColor[item.variant])}>
                {typeof item.value === "number" ? item.value.toLocaleString() : item.value}
              </span>
              {item.trend && (
                /* Stitch: text-[12px] font-mono-data bg-secondary-container/20 px-1.5 py-0.5 rounded */
                <span className={cn(
                  "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] mono-number font-semibold border",
                  badgeCls,
                )}>
                  {item.trendDirection === "up" ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : item.trendDirection === "down" ? (
                    <ArrowDownRight className="h-3 w-3" />
                  ) : null}
                  {item.trend}
                </span>
              )}
            </div>

            {/* Sublabel */}
            <p className="text-[11px] text-slate-400 mt-2 leading-tight">{item.sublabel}</p>
          </div>
        );
      })}
    </div>
  );
}
