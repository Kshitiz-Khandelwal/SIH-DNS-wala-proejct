"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  Brain,
  Database,
  LayoutDashboard,
  FileText,
  Monitor,
  Radio,
  Settings,
  Shield,
  ShieldAlert,
  Zap,
  BookOpen,
  TrendingUp,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logout } from "@/lib/auth";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "MONITORING",
    items: [
      { href: "/app/dashboard", label: "Overview", icon: LayoutDashboard },
      { href: "/app/forecast", label: "Attack Forecasting", icon: TrendingUp, badge: "SIH 2026", badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
      { href: "/app/queue", label: "Live Traffic", icon: Radio },
      { href: "/app/analytics", label: "Analytics", icon: Activity },
    ],
  },
  {
    label: "DETECTION & ML",
    items: [
      { href: "/app/pipeline", label: "Pipeline Engine", icon: Zap },
      { href: "/app/threats", label: "Threat Intel", icon: Database },
      { href: "/app/xai", label: "XAI Telemetry", icon: Brain },
      { href: "/app/models", label: "Model Rationale", icon: BookOpen },
    ],
  },
  {
    label: "OPERATIONS",
    items: [
      { href: "/app/quarantine", label: "Quarantine Queue", icon: ShieldAlert, badge: "2 ACTIVE", badgeColor: "bg-rose-500/20 text-rose-300 border-rose-500/30" },
      { href: "/app/devices", label: "Device Fleet", icon: Monitor },
      { href: "/app/reports", label: "Reports & CERT-In", icon: FileText },
      { href: "/app/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <aside className="hidden w-[240px] bg-[#0b0f19] border-r border-slate-800/80 flex-col shrink-0 z-30 md:flex h-screen select-none sticky top-0">
      {/* Brand Header */}
      <div className="px-6 py-5 flex items-center gap-3 border-b border-slate-800/60">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-lg shadow-blue-500/20 shrink-0 font-bold">
          <Shield className="h-4 w-4" />
        </div>
        <div>
          <h1 className="font-bold text-sm text-slate-100 leading-tight tracking-tight">DNS Shield</h1>
          <p className="font-mono text-[10px] text-slate-400">v3.2 · X-Forecast</p>
        </div>
      </div>

      {/* Operational status pill */}
      <div className="px-6 py-3 border-b border-slate-800/60">
        <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full px-3 py-1 w-max text-[11px] font-mono font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 radar-beacon" />
          <span>NODE: DEL-EDGE-01</span>
        </div>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3 pb-2 text-[9px] font-bold uppercase tracking-widest text-slate-500 font-mono">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all group relative",
                      isActive
                        ? "bg-blue-600/15 text-blue-400 border border-blue-500/30 font-bold shadow-xs"
                        : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                    )}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0 transition-transform group-hover:scale-110", isActive ? "text-blue-400" : "text-slate-400")} />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge && (
                      <span className={cn("text-[9px] font-mono px-1.5 py-0.5 rounded font-bold border", item.badgeColor || "bg-slate-800 text-slate-300 border-slate-700")}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer Profile & Logout */}
      <div className="p-3 border-t border-slate-800/60">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono text-slate-400 hover:bg-slate-800/60 hover:text-rose-400 transition-all"
        >
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>OPERATOR</span>
          </span>
          <LogOut className="h-3.5 w-3.5" />
        </button>
      </div>
    </aside>
  );
}
