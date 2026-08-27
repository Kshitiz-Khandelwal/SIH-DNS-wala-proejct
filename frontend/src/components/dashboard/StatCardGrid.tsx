"use client";

import React from "react";
import { motion } from "framer-motion";
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

const topAccentLine = {
  allow:   "bg-emerald-500",
  flag:    "bg-amber-400",
  block:   "bg-rose-500",
  neutral: "bg-blue-500",
};

const metricColor = {
  allow:   "text-emerald-600",
  flag:    "text-amber-600",
  block:   "text-rose-600",
  neutral: "text-blue-600",
};

export function StatCardGrid({ items }: { items: StatItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item, idx) => {
        const Icon = iconMap[item.variant] || Activity;

        return (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="group relative overflow-hidden rounded-xl bg-white border border-slate-200 p-5 shadow-sm hover:border-emerald-300 hover:-translate-y-1 transition-all"
          >
            {/* Top Glowing Stripe */}
            <div className={cn("absolute top-0 left-0 right-0 h-1", topAccentLine[item.variant])} />

            <div className="flex justify-between items-start mb-3">
              <span className="text-[10px] font-mono uppercase font-bold text-slate-400 tracking-wider">
                {item.label}
              </span>
              <Icon className={cn("h-4.5 w-4.5 shrink-0", metricColor[item.variant])} />
            </div>

            <div className="flex items-baseline gap-2 mt-auto">
              <span className={cn("font-mono text-2xl font-bold tracking-tight leading-none", metricColor[item.variant])}>
                {typeof item.value === "number" ? item.value.toLocaleString() : item.value}
              </span>
              {item.trend && (
                <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-mono font-bold bg-slate-100 text-emerald-600 border border-emerald-200">
                  {item.trendDirection === "up" ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {item.trend}
                </span>
              )}
            </div>

            <p className="text-[11px] text-slate-500 mt-2 font-mono leading-tight">{item.sublabel}</p>
          </motion.div>
        );
      })}
    </div>
  );
}
