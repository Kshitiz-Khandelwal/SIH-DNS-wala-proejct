"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function AppHeader() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [qps, setQps] = useState(13285);

  useEffect(() => {
    setMounted(true);
    const tick = () => {
      setQps((v) => v + Math.floor(Math.random() * 8 - 4));
    };
    const id = setInterval(tick, 2000);
    return () => clearInterval(id);
  }, []);

  const pageTitle = {
    "/app/dashboard": "Overview",
    "/app/queue": "Live Query Stream",
    "/app/analytics": "Analytics & Telemetry",
    "/app/pipeline": "Pipeline Architecture",
    "/app/threats": "Threat Intelligence",
    "/app/xai": "XAI Analysis",
    "/app/models": "Model Rationale",
    "/app/devices": "Devices & Fleet",
    "/app/reports": "Security Reports",
    "/app/settings": "Settings",
  }[pathname] ||
    (pathname.startsWith("/app/domain") ? "Domain Inspector" : "DNS Shield");

  return (
    <header className="h-16 bg-white/90 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-6 md:px-8 sticky top-0 z-20 shadow-2xs">
      <h1 className="text-xl font-bold text-slate-900 tracking-tight">{pageTitle}</h1>
      
      <div className="flex items-center gap-4 sm:gap-6">
        {/* Status Pill */}
        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 rounded-full border border-emerald-100 shadow-2xs">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-bold text-emerald-700 tracking-wide uppercase font-mono">
            Resolver Operational
          </span>
        </div>

        {/* Live QPS with Sparkline */}
        <div className="hidden sm:flex items-center gap-4 pl-5 border-l border-slate-200">
          <div className="flex flex-col text-right">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">Live QPS</span>
            <span className="text-sm font-bold font-mono tracking-tight text-slate-900">
              {mounted ? qps.toLocaleString() : "13,285"}{" "}
              <span className="text-xs font-sans text-slate-400 font-normal">Q/s</span>
            </span>
          </div>
          <svg className="w-12 h-6 text-blue-500" viewBox="0 0 100 30" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M0 20 L20 15 L40 25 L60 10 L80 18 L100 5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </header>
  );
}
