"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Bell, Search } from "lucide-react";

export function AppHeader() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [qps, setQps] = useState(24100);

  useEffect(() => {
    setMounted(true);
    const tick = () => {
      setQps((v) => v + Math.floor(Math.random() * 12 - 6));
    };
    const id = setInterval(tick, 2000);
    return () => clearInterval(id);
  }, []);

  const pageTitle = {
    "/app/dashboard": "Sovereign Command Center Overview",
    "/app/forecast": "AI Attack Forecasting & Hardware Sentinel",
    "/app/queue": "Live Query Stream",
    "/app/analytics": "SOC Query Analytics & Telemetry",
    "/app/pipeline": "7-Stage Policy Cascade Engine",
    "/app/threats": "Threat Intelligence & Sovereign Feeds",
    "/app/xai": "Explainable AI (XAI) Telemetry",
    "/app/models": "Model Architecture & Academic Rationale",
    "/app/quarantine": "Quarantine Queue & Active Response",
    "/app/devices": "Device Fleet & Subnet IPAM Matrix",
    "/app/reports": "Shift Reports & CERT-In Compliance",
    "/app/settings": "Console Settings",
  }[pathname] || "DNS Shield X-Forecast";

  return (
    <header className="sticky top-0 h-16 w-full z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200 flex justify-between items-center px-8 shadow-2xs">
      {/* Left: Title + status */}
      <div className="flex items-center gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight leading-none font-display">{pageTitle}</h2>
          <p className="text-[11px] text-slate-500 mt-1">Sub-millisecond cheap-to-expensive detection plane telemetry.</p>
        </div>
      </div>

      {/* Right: Quick Search Bar + Live QPS Counter + SLA */}
      <div className="flex items-center gap-4">
        {/* Quick Command Search Bar */}
        <div className="hidden lg:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-600">
          <Search className="h-3.5 w-3.5 text-slate-400" />
          <span className="font-mono text-[11px]">Type <kbd className="bg-white border border-slate-200 text-slate-700 px-1 py-0.5 rounded text-[10px] shadow-2xs">⌘K</kbd> to search telemetry...</span>
        </div>

        {/* QPS & SLA Badge */}
        <div className="hidden md:flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-1.5 text-xs font-mono">
          <span className="text-[10px] uppercase font-bold text-slate-400">LIVE QPS</span>
          <span className="font-bold text-emerald-600">
            {mounted ? qps.toLocaleString() : "24,100"} Q/s
          </span>
          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200 font-bold">1.42ms SLA</span>
        </div>

        <button
          type="button"
          aria-label="Notifications"
          className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 transition-all relative"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
        </button>
      </div>
    </header>
  );
}
