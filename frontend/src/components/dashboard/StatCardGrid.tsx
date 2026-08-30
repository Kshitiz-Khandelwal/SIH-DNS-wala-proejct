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
  title?: string;
  caption?: string;
  label?: string;
  value: string | number;
  sublabel: string;
  trend?: string;
  trendDirection?: "up" | "down" | "neutral";
  variant: "allow" | "flag" | "block" | "neutral";
  sparkline?: number[];
}

interface StatCardGridProps {
  items: StatItem[];
  hasLiveBlock?: boolean;
  loading?: boolean;
}

const colorConfig = {
  allow: {
    topStripe: "bg-emerald-500",
    text: "text-emerald-700",
    iconBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
    badge: "bg-emerald-50 text-emerald-800 border-emerald-200",
    hoverBorder: "hover:border-emerald-300",
    glowBg: "from-emerald-500/5 to-transparent",
    sparkStroke: "#059669",
    sparkFill: "rgba(5, 150, 105, 0.1)",
  },
  flag: {
    topStripe: "bg-amber-500",
    text: "text-amber-700",
    iconBg: "bg-amber-50 text-amber-700 border-amber-200",
    badge: "bg-amber-50 text-amber-800 border-amber-200",
    hoverBorder: "hover:border-amber-300",
    glowBg: "from-amber-500/5 to-transparent",
    sparkStroke: "#d97706",
    sparkFill: "rgba(217, 119, 6, 0.1)",
  },
  block: {
    topStripe: "bg-rose-500",
    text: "text-rose-700",
    iconBg: "bg-rose-50 text-rose-700 border-rose-200",
    badge: "bg-rose-50 text-rose-800 border-rose-200",
    hoverBorder: "hover:border-rose-300",
    glowBg: "from-rose-500/5 to-transparent",
    sparkStroke: "#e11d48",
    sparkFill: "rgba(225, 29, 72, 0.1)",
  },
  neutral: {
    topStripe: "bg-blue-500",
    text: "text-blue-700",
    iconBg: "bg-blue-50 text-blue-700 border-blue-200",
    badge: "bg-blue-50 text-blue-800 border-blue-200",
    hoverBorder: "hover:border-blue-300",
    glowBg: "from-blue-500/5 to-transparent",
    sparkStroke: "#2563eb",
    sparkFill: "rgba(37, 99, 235, 0.1)",
  },
};

const iconMap = {
  allow: ShieldCheck,
  flag: AlertTriangle,
  block: ShieldAlert,
  neutral: Activity,
};

function MiniSparkline({ data, stroke, fill }: { data: number[]; stroke: string; fill: string }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const height = 28;
  const width = 80;

  const points = data
    .map((val, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 6) - 3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <svg className="h-7 w-20 overflow-visible shrink-0" viewBox={`0 0 ${width} ${height}`}>
      <polygon points={areaPoints} fill={fill} />
      <polyline points={points} fill="none" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function StatCardGrid({ items, hasLiveBlock = false, loading = false }: StatCardGridProps) {
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
            key={item.title || item.label}
            className={cn(
              "group relative overflow-hidden rounded-xl border bg-white p-4.5 shadow-2xs transition-all duration-200 hover:-translate-y-0.5",
              conf.hoverBorder,
              isBlockItem && flashBlock
                ? "border-rose-500 ring-2 ring-rose-200 bg-rose-50/20"
                : "border-slate-200"
            )}
          >
            {/* Ambient Radial Gradient Accent */}
            <div className={cn("absolute inset-0 bg-gradient-to-br pointer-events-none opacity-40", conf.glowBg)} />

            {/* Vibrant Top Accent Stripe */}
            <div className={cn("absolute top-0 left-0 right-0 h-1", conf.topStripe)} />

            <div className="flex items-start justify-between mb-2.5 relative z-10">
              <div>
                <h4 className="text-xs font-sans font-bold text-slate-800 tracking-tight">
                  {item.title || item.label}
                </h4>
                {item.caption && (
                  <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                    {item.caption}
                  </span>
                )}
              </div>
              <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg border shadow-2xs shrink-0", conf.iconBg)}>
                <Icon className="h-4 w-4" />
              </div>
            </div>

            {loading ? (
              <div className="space-y-2 py-1 relative z-10">
                <div className="h-7 w-28 rounded-md bg-slate-100 animate-pulse" />
                <div className="h-3.5 w-44 rounded-md bg-slate-100 animate-pulse" />
              </div>
            ) : (
              <div className="relative z-10">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-baseline gap-2">
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

                  {item.sparkline && item.sparkline.length > 1 && (
                    <MiniSparkline
                      data={item.sparkline}
                      stroke={conf.sparkStroke}
                      fill={conf.sparkFill}
                    />
                  )}
                </div>

                <p className="text-[11px] text-slate-500 mt-2 font-medium leading-tight">
                  {item.sublabel}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
