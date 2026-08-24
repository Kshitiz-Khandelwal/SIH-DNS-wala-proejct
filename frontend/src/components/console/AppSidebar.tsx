"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logout } from "@/lib/auth";
import { useRouter } from "next/navigation";

interface NavGroup {
  label: string;
  items: {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }[];
}

const navGroups: NavGroup[] = [
  {
    label: "MONITORING",
    items: [
      { href: "/app/dashboard", label: "Overview", icon: LayoutDashboard },
      { href: "/app/forecast", label: "Attack Forecasting", icon: TrendingUp, badge: "SIH 2026" },
      { href: "/app/queue", label: "Live Traffic", icon: Radio },
      { href: "/app/analytics", label: "Analytics", icon: Activity },
    ],
  },
  {
    label: "DETECTION & ML",
    items: [
      { href: "/app/pipeline", label: "Pipeline", icon: Zap },
      { href: "/app/threats", label: "Threat Models", icon: Database },
      { href: "/app/xai", label: "XAI Anomalies", icon: Brain },
      { href: "/app/models", label: "Model Rationale", icon: BookOpen },
    ],
  },
  {
    label: "MANAGEMENT",
    items: [
      { href: "/app/quarantine", label: "Quarantine Queue", icon: ShieldAlert, badge: "NEW" },
      { href: "/app/devices", label: "Devices", icon: Monitor },
      { href: "/app/reports", label: "Reports & Policies", icon: FileText },
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
    <>
      {/* Desktop Sidebar — Clean sticky flex sidebar (prevents overlap) */}
      <aside className="hidden w-[240px] bg-white border-r border-slate-200 flex-col shrink-0 z-30 md:flex h-screen select-none sticky top-0">
        {/* Brand Header */}
        <div className="px-6 py-5 flex items-center gap-3 border-b border-slate-100">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-600 text-white shadow-xs shrink-0">
            <Shield className="h-4 w-4" />
          </div>
          <div>
            <h1 className="font-bold text-[17px] text-blue-700 leading-tight tracking-tight">DNS Shield</h1>
            <p className="font-mono text-[9px] text-slate-400 tracking-widest">v2.6 · Enterprise</p>
          </div>
        </div>

        {/* Operational status pill */}
        <div className="px-6 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-full px-3 py-1 w-max">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="super-heading text-emerald-700">System Operational</span>
          </div>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
          {navGroups.map((group) => (
            <div key={group.label}>
              <h3 className="super-heading text-slate-400 px-4 mb-1.5">{group.label}</h3>
          <div className="space-y-0.5">
                {group.items.map(({ href, label, icon: Icon, badge }) => {
                  const active =
                    pathname === href ||
                    (href !== "/app" && pathname.startsWith(href + "/"));
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2 text-[13px] font-medium transition-all duration-120 rounded-r",
                        active
                          ? "nav-link-active"
                          : "nav-link-idle",
                      )}
                    >
                      <Icon className={cn("h-4 w-4 shrink-0", active ? "text-blue-600" : "text-slate-400")} />
                      <span className="flex-1">{label}</span>
                      {badge && (
                        <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[9px] font-bold text-rose-700 font-mono">
                          {badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom: status box + logout */}
        <div className="border-t border-slate-100 px-3 py-3 space-y-1">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
            <div className="flex justify-between items-center">
              <div className="flex flex-col gap-0.5">
                <span className="mono-number text-[11px] font-bold text-slate-800">Uptime: 99.8%</span>
                <span className="mono-number text-[10px] text-slate-400">Model v1.0.3 · Online</span>
              </div>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-4 py-2 text-[12px] text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded transition-colors"
          >
            <span className="text-[14px]">↪</span> Sign out
          </button>
        </div>
      </aside>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-50 flex border-t border-slate-200 bg-white md:hidden">
        {navGroups[0].items.concat(navGroups[1].items.slice(0, 2)).map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-3 text-[10px] font-medium",
                active ? "text-blue-600 font-semibold" : "text-slate-400",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
