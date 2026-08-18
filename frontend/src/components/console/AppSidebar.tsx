"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  Brain,
  Database,
  LayoutDashboard,
  List,
  LogOut,
  Monitor,
  Radio,
  Settings,
  Shield,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logout } from "@/lib/auth";

interface NavGroup {
  label: string;
  items: {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[];
}

const navGroups: NavGroup[] = [
  {
    label: "MONITORING",
    items: [
      { href: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/app/queue", label: "Live Queries", icon: Radio },
      { href: "/app/analytics", label: "Analytics", icon: Activity },
    ],
  },
  {
    label: "DETECTION & ML",
    items: [
      { href: "/app/pipeline", label: "Pipeline", icon: Zap },
      { href: "/app/threats", label: "Threat Intel", icon: Database },
      { href: "/app/xai", label: "XAI Analysis", icon: Brain },
    ],
  },
  {
    label: "MANAGEMENT",
    items: [
      { href: "/app/devices", label: "Devices", icon: Monitor },
      { href: "/app/reports", label: "Reports", icon: List },
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
      {/* Desktop Sidebar â€” 240px fixed width, sidebar-06 pattern */}
      <aside className="hidden w-[240px] shrink-0 flex-col border-r border-slate-200/80 bg-white shadow-xs md:flex h-screen">
        {/* Brand Header */}
        <div className="flex h-16 items-center border-b border-slate-100 px-5">
          <Link href="/app/dashboard" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
              <Shield className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-sans text-sm font-bold tracking-tight text-slate-900 leading-tight">
                DNS SHIELD
              </span>
              <span className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase leading-tight mt-0.5">
                AI Threat Defense
              </span>
            </div>
          </Link>
        </div>

        {/* Grouped Nav Items */}
        <nav className="flex-1 space-y-6 overflow-y-auto p-4">
          {navGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {group.label}
              </div>
              {group.items.map(({ href, label, icon: Icon }) => {
                const active =
                  pathname === href ||
                  (href !== "/app" && pathname.startsWith(href + "/"));
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                      active
                        ? "bg-slate-100 font-semibold text-blue-600 shadow-2xs"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-[18px] w-[18px] shrink-0",
                        active ? "text-blue-600" : "text-slate-400",
                      )}
                    />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer Area */}
        <div className="border-t border-slate-100 p-4 space-y-3 bg-slate-50/50">
          <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/70 p-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                SYSTEM PROTECTED
              </span>
            </div>
            <p className="mt-1 text-xs text-emerald-700 font-medium">All 7 pipeline stages active</p>
          </div>

          <div className="flex items-center justify-between px-1 text-xs text-slate-500">
            <span>DNS Shield v2.6.1</span>
            <span className="font-mono text-[11px] text-slate-400">Build 5578</span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Tab Bar */}
      <nav className="fixed inset-x-0 bottom-0 z-50 flex border-t border-slate-200 bg-white md:hidden">
        {navGroups[0].items.concat(navGroups[1].items.slice(0, 2)).map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-3 text-[10px] font-medium",
                active ? "text-blue-600 font-semibold" : "text-slate-500",
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
