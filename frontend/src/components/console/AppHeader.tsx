"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Bell, UserCircle } from "lucide-react";

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
    <header className="sticky top-0 h-16 w-full z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 flex justify-between items-center px-8 shadow-2xs">
      {/* Left: Title + operational badge */}
      <div className="flex items-center gap-5">
        <h2 className="text-[18px] font-bold text-blue-700 tracking-tight leading-none">{pageTitle}</h2>
        {/* Resolver operational pill */}
        <div className="hidden lg:flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-full px-3 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="super-heading text-emerald-700 tracking-wider">RESOLVER OPERATIONAL</span>
        </div>
      </div>

      {/* Right: QPS counter + notification + user */}
      <div className="flex items-center gap-5">
        {/* QPS box with sparkline */}
        <div className="hidden md:flex items-center gap-3 bg-slate-50 border border-slate-200 rounded px-4 py-1.5 technical-shadow">
          <span className="super-heading text-slate-400">LIVE QPS</span>
          <span className="mono-number text-[13px] font-bold text-slate-900">
            {mounted ? qps.toLocaleString() : "13,285"} Q/s
          </span>
          <svg className="w-12 h-4 text-blue-500 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 50 20">
            <path d="M0 10 Q 5 5, 10 10 T 20 10 T 30 15 T 40 5 T 50 10" strokeLinecap="round" strokeWidth="1.5" />
          </svg>
        </div>

        {/* Icon actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Notifications"
            className="text-slate-400 hover:text-blue-600 transition-colors"
          >
            <Bell className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Account"
            className="text-slate-400 hover:text-blue-600 transition-colors"
          >
            <UserCircle className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
