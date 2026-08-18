"use client";

import { useEffect, useState } from "react";

export function AppHeader() {
  const [mounted, setMounted] = useState(false);
  const [time, setTime] = useState("12:00:00 PM");
  const [dateStr, setDateStr] = useState("Aug 17, 2026");
  const [qps, setQps] = useState(12842);
  const [blocked, setBlocked] = useState(7213);
  const [uptime] = useState("47d 02:11:09");

  useEffect(() => {
    setMounted(true);
    const tick = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString("en-US", { hour12: true, hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      setDateStr(now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }));
      setQps((v) => v + Math.floor(Math.random() * 6 - 2));
      setBlocked((v) => v + (Math.random() > 0.85 ? 1 : 0));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-slate-200/80 bg-white/95 px-6 backdrop-blur-md shadow-xs">
      {/* Left Live Metrics */}
      <div className="flex items-center gap-6 md:gap-8">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
          <span className="text-xs font-medium text-slate-500 hidden sm:inline">Live Traffic</span>
          <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-100">
            {mounted ? qps.toLocaleString() : "12,842"} QPS
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500 hidden sm:inline">Threats Blocked</span>
          <span className="font-mono text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-md border border-rose-100">
            {mounted ? blocked.toLocaleString() : "7,213"}
          </span>
        </div>
        <div className="hidden lg:flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Uptime</span>
          <span className="font-mono text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-100">
            {uptime}
          </span>
        </div>
      </div>

      {/* Right User & Timestamp */}
      <div className="flex items-center gap-4 md:gap-5">
        <div className="hidden sm:block text-right">
          <div className="font-mono text-xs font-bold text-slate-800">{mounted ? time : "12:00:00 PM"}</div>
          <div className="text-[10px] text-slate-500 font-medium">
            {mounted ? dateStr : "Aug 17, 2026"}
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 shadow-2xs">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold text-white shadow-2xs">
            SA
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800 leading-tight">SOC ANALYST</div>
            <div className="text-[10px] text-slate-500 leading-tight font-medium">Level 3 Access</div>
          </div>
        </div>
      </div>
    </header>
  );
}
