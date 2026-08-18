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

const circleStyles = {
  allow: "bg-emerald-50 text-emerald-600 border border-emerald-200/80",
  flag: "bg-amber-50 text-amber-600 border border-amber-200/80",
  block: "bg-rose-50 text-rose-600 border border-rose-200/80",
  neutral: "bg-blue-50 text-blue-600 border border-blue-200/80",
};

const topAccentLine = {
  allow: "bg-emerald-500",
  flag: "bg-amber-500",
  block: "bg-rose-500",
  neutral: "bg-blue-500",
};

const textAccent = {
  allow: "text-emerald-700",
  flag: "text-amber-700",
  block: "text-rose-700",
  neutral: "text-slate-900",
};

const trendBadgeStyles = {
  up_green: "bg-emerald-50 text-emerald-700 border-emerald-200",
  down_green: "bg-emerald-50 text-emerald-700 border-emerald-200",
  up_red: "bg-rose-50 text-rose-700 border-rose-200",
  down_red: "bg-rose-50 text-rose-700 border-rose-200",
  neutral: "bg-slate-50 text-slate-600 border-slate-200",
};

export function StatCardGrid({ items }: { items: StatItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => {
        const Icon = iconMap[item.variant] || Activity;
        const isDangerStat = item.variant === "block" || item.variant === "flag";

        let badgeStyle = trendBadgeStyles.neutral;
        if (item.trendDirection === "up") {
          badgeStyle = isDangerStat ? trendBadgeStyles.up_red : trendBadgeStyles.up_green;
        } else if (item.trendDirection === "down") {
          badgeStyle = isDangerStat ? trendBadgeStyles.down_green : trendBadgeStyles.down_red;
        }

        return (
          <div
            key={item.label}
            className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"
          >
            {/* Top Accent Stripe */}
            <div className={cn("absolute top-0 left-0 right-0 h-0.5", topAccentLine[item.variant])} />

            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono block">
                  {item.label}
                </span>
                <div className={cn("font-mono text-3xl font-bold mt-2 tracking-tight", textAccent[item.variant])}>
                  {typeof item.value === "number" ? item.value.toLocaleString() : item.value}
                </div>
              </div>
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-2xs transition-transform group-hover:scale-105",
                  circleStyles[item.variant],
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
              <span className="font-medium">{item.sublabel}</span>
              {item.trend && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-mono font-semibold",
                    badgeStyle,
                  )}
                >
                  {item.trendDirection === "up" ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : item.trendDirection === "down" ? (
                    <ArrowDownRight className="h-3 w-3" />
                  ) : null}
                  {item.trend}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
