"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Search, Shield, Zap, CheckCircle2, AlertTriangle, X, ExternalLink, ArrowRight, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  title: string;
  desc: string;
  time: string;
  type: "alert" | "info" | "warning";
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "n1",
    title: "DGA Beacon Blocked",
    desc: "Domain 'xkq982-c2-beacon.ru' blocked by Stage 3 ML Lexical model.",
    time: "2 mins ago",
    type: "alert",
  },
  {
    id: "n2",
    title: "Threat Feeds Synced",
    desc: "133,720 IOC indicators refreshed from Abuse.ch and URLhaus.",
    time: "14 mins ago",
    type: "info",
  },
  {
    id: "n3",
    title: "High Entropy Burst",
    desc: "Client 192.168.1.45 flagged for DNS Tunneling heuristic check.",
    time: "42 mins ago",
    type: "warning",
  },
];

const SEARCH_ROUTES = [
  { label: "Overview Command Center", href: "/app/dashboard", category: "Navigation" },
  { label: "AI Attack Forecasting", href: "/app/forecast", category: "MITRE ATT&CK" },
  { label: "7-Stage Policy Pipeline", href: "/app/pipeline", category: "Engine" },
  { label: "Threat Intelligence & RPZ", href: "/app/threats", category: "Feeds" },
  { label: "Explainable AI (XAI) Telemetry", href: "/app/xai", category: "Machine Learning" },
  { label: "Model Rationale & SHAP", href: "/app/models", category: "Machine Learning" },
  { label: "Quarantine Queue", href: "/app/quarantine", category: "Operations" },
  { label: "Device Fleet IPAM", href: "/app/devices", category: "Operations" },
  { label: "Live Query Traffic Stream", href: "/app/queue", category: "Monitoring" },
  { label: "SOC Query Analytics", href: "/app/analytics", category: "Monitoring" },
  { label: "Reports & CERT-In", href: "/app/reports", category: "Compliance" },
];

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [qps, setQps] = useState(24100);

  // Notifications State
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const notifRef = useRef<HTMLDivElement>(null);

  // Command Palette State
  const [showCommandSearch, setShowCommandSearch] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    const tick = () => {
      setQps((v) => v + Math.floor(Math.random() * 12 - 6));
    };
    const id = setInterval(tick, 2000);
    return () => clearInterval(id);
  }, []);

  // Keyboard shortcut listener (Cmd+K / Ctrl+K / Escape)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowCommandSearch((prev) => !prev);
      }
      if (e.key === "Escape") {
        setShowCommandSearch(false);
        setShowNotifications(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus search on open
  useEffect(() => {
    if (showCommandSearch) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [showCommandSearch]);

  // Click outside to close notification dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    }
    if (showNotifications) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showNotifications]);

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

  const filteredRoutes = SEARCH_ROUTES.filter((r) =>
    r.label.toLowerCase().includes(commandQuery.toLowerCase()) ||
    r.category.toLowerCase().includes(commandQuery.toLowerCase())
  );

  return (
    <>
      <header className="sticky top-0 h-16 w-full z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200 flex justify-between items-center px-8 shadow-2xs">
        {/* Left: Breadcrumbs + Title + status */}
        <div className="flex items-center gap-4">
          <div>
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400 mb-1">
              <Link href="/" className="hover:text-blue-600 transition-colors">Home</Link>
              <span>/</span>
              <Link href="/app/dashboard" className="hover:text-blue-600 transition-colors">Console</Link>
              <span>/</span>
              <span className="text-slate-700 font-semibold">{pageTitle.split(" ")[0]}</span>
            </nav>
            <h1 className="text-base font-bold text-slate-900 tracking-tight leading-none font-display">{pageTitle}</h1>
            <p className="text-[11px] text-slate-500 mt-1">Sub-millisecond cheap-to-expensive detection plane telemetry.</p>
          </div>
        </div>

        {/* Right: Quick Search Bar + Landing Page Link + Live QPS Counter + SLA */}
        <div className="flex items-center gap-3">
          {/* Landing Page Quick Switch Button */}
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 px-3 py-1.5 font-mono text-xs font-semibold text-slate-700 transition-all shadow-2xs group"
          >
            <Globe className="h-3.5 w-3.5 text-emerald-600 group-hover:rotate-12 transition-transform" />
            <span>Landing Page</span>
            <ExternalLink className="h-3 w-3 text-slate-400" />
          </Link>

          {/* Quick Command Search Bar (Functional Button) */}
          <button
            type="button"
            onClick={() => setShowCommandSearch(true)}
            className="hidden lg:flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-600 transition-all cursor-pointer text-left"
          >
            <Search className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-mono text-[11px]">Type <kbd className="bg-white border border-slate-200 text-slate-700 px-1 py-0.5 rounded text-[10px] shadow-2xs">⌘K</kbd> to search telemetry...</span>
          </button>

          {/* QPS & SLA Badge */}
          <div className="hidden md:flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-1.5 text-xs font-mono">
            <span className="text-[10px] uppercase font-bold text-slate-400">LIVE QPS</span>
            <span className="font-bold text-emerald-600">
              {mounted ? qps.toLocaleString() : "24,100"} Q/s
            </span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200 font-bold">1.42ms SLA</span>
          </div>

          {/* Notification Button & Popover */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              aria-label="Notifications"
              onClick={() => setShowNotifications((prev) => !prev)}
              className={cn(
                "p-2 rounded-lg border text-slate-600 hover:text-slate-900 transition-all relative cursor-pointer",
                showNotifications ? "bg-slate-100 border-slate-300" : "bg-slate-50 hover:bg-slate-100 border-slate-200"
              )}
            >
              <Bell className="h-4 w-4" />
              {notifications.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-slate-200 bg-white p-4 shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900 font-sans">Live Alert Notifications</span>
                    <span className="bg-rose-100 text-rose-700 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full">
                      {notifications.length} New
                    </span>
                  </div>
                  {notifications.length > 0 && (
                    <button
                      onClick={() => setNotifications([])}
                      className="text-[10px] text-slate-400 hover:text-slate-600 font-mono transition-colors"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                <div className="mt-3 space-y-2.5 max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">
                      <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-1.5" />
                      All telemetry alerts acknowledged
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={cn(
                          "p-3 rounded-lg border text-left text-xs transition-all",
                          n.type === "alert" && "bg-rose-50/60 border-rose-100 text-rose-950",
                          n.type === "warning" && "bg-amber-50/60 border-amber-100 text-amber-950",
                          n.type === "info" && "bg-blue-50/60 border-blue-100 text-blue-950"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold font-sans text-xs">{n.title}</span>
                          <span className="font-mono text-[10px] text-slate-400">{n.time}</span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-600 leading-snug">{n.desc}</p>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 text-center">
                  <button
                    onClick={() => {
                      setShowNotifications(false);
                      router.push("/app/queue");
                    }}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors inline-flex items-center gap-1"
                  >
                    Open Live Query Queue <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Quick Command Search Dialog Modal */}
      {showCommandSearch && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Input Header */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 bg-slate-50/50">
              <Search className="h-4 w-4 text-slate-400 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={commandQuery}
                onChange={(e) => setCommandQuery(e.target.value)}
                placeholder="Search console pages, models, telemetry..."
                className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none font-sans"
              />
              <button
                onClick={() => setShowCommandSearch(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Results List */}
            <div className="max-h-80 overflow-y-auto p-2 space-y-1">
              {filteredRoutes.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No matching telemetry views found for &ldquo;{commandQuery}&rdquo;
                </div>
              ) : (
                filteredRoutes.map((r) => (
                  <button
                    key={r.href}
                    onClick={() => {
                      setShowCommandSearch(false);
                      setCommandQuery("");
                      router.push(r.href);
                    }}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <Zap className="h-3.5 w-3.5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                      <span>{r.label}</span>
                    </div>
                    <span className="font-mono text-[10px] text-slate-400 uppercase tracking-wider group-hover:text-emerald-700">
                      {r.category}
                    </span>
                  </button>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span>Press <kbd className="bg-white border px-1 rounded">ESC</kbd> to close</span>
              <span>DNS Shield Sovereign Command</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
