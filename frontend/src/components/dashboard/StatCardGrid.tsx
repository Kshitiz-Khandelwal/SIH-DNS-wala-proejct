"use client";

import React, { useEffect, useState } from "react";
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

interface StatCardGridProps {
  items: StatItem[];
  hasLiveBlock?: boolean;
}

const colorConfig = {
  allow: {
    topStripe: "bg-emerald-500",
    text: "text-emerald-600",
    iconBg: "bg-emerald-50 text-emerald-600 border-emerald-200",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    hoverBorder: "hover:border-emerald-300",
  },
  flag: {
    topStripe: "bg-amber-400",
    text: "text-amber-600",
    iconBg: "bg-amber-50 text-amber-600 border-amber-200",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    hoverBorder: "hover:border-amber-300",
  },
  block: {
    topStripe: "bg-rose-500",
    text: "text-rose-600",
    iconBg: "bg-rose-50 text-rose-600 border-rose-200",
    badge: "bg-rose-50 text-rose-700 border-rose-200",
    hoverBorder: "hover:border-rose-300",
  },
  neutral: {
    topStripe: "bg-blue-500",
    text: "text-blue-600",
    iconBg: "bg-blue-50 text-blue-600 border-blue-200",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    hoverBorder: "hover:border-blue-300",
  },
};

const iconMap = {
  allow: ShieldCheck,
  flag: AlertTriangle,
  block: ShieldAlert,
  neutral: Activity,
};

export function StatCardGrid({ items, hasLiveBlock = false }: StatCardGridProps) {
  const [flashBlock, setFlashBlock] = useState(false);

  useEffect(() => {
    if (hasLiveBlock) {
      setFlashBlock(true);
      const timer = setTimeout(() => setFlashBlock(false), 900);
      return () => clearTimeout(timer);
    }
  }, [hasLiveBlock]);

  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => {
        const conf = colorConfig[item.variant] || colorConfig.neutral;
        const Icon = iconMap[item.variant] || Activity;
        const isBlockItem = item.variant === "block";

        return (
          <div
            key={item.label}
            className={cn(
              "group relative overflow-hidden rounded-xl border bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5",
              conf.hoverBorder,
              isBlockItem && flashBlock
                ? "border-rose-500 ring-2 ring-rose-200 bg-rose-50/20"
                : "border-slate-200"
            )}
          >
            {/* Vibrant Top Accent Stripe */}
            <div className={cn("absolute top-0 left-0 right-0 h-1", conf.topStripe)} />

            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-mono uppercase font-bold text-slate-400 tracking-wider">
                {item.label}
              </span>
              <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg border shadow-2xs", conf.iconBg)}>
                <Icon className="h-4 w-4" />
              </div>
            </div>

            <div className="flex items-baseline gap-2.5">
              <span className={cn("font-mono text-2xl font-bold tracking-tight tabular-nums", conf.text)}>
                {typeof item.value === "number" ? item.value.toLocaleString() : item.value}
              </span>
              {item.trend && (
                <span className={cn("inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-mono font-bold border", conf.badge)}>
                  {item.trendDirection === "up" ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : item.trendDirection === "down" ? (
                    <ArrowDownRight className="h-3 w-3" />
                  ) : null}
                  {item.trend}
                </span>
              )}
            </div>

            <p className="text-[11px] text-slate-500 mt-2 font-medium leading-tight">
              {item.sublabel}
            </p>
          </div>
        );
      })}
    </div>
  );
}
