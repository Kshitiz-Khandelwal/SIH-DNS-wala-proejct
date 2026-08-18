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
  Zap,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
      { href: "/app/dashboard", label: "Overview", icon: LayoutDashboard },
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
      { href: "/app/devices", label: "Devices", icon: Monitor },
      { href: "/app/reports", label: "Reports & Policies", icon: FileText },
      { href: "/app/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden w-[240px] bg-white border-r border-slate-200 flex-col shrink-0 z-10 md:flex h-screen select-none shadow-xs">
        {/* Brand Header */}
        <div className="p-5 flex items-center gap-2.5 border-b border-slate-100">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L3 6V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V6L12 2ZM12 10.99H20C19.53 15.34 16.29 19.16 12 20.35V10.99H4V7.3L12 4.34V10.99Z" />
            </svg>
          </div>
          <div>
            <span className="font-bold text-base tracking-tight text-slate-900 block leading-tight">DNS Shield</span>
            <span className="font-mono text-[9px] font-bold text-blue-600 uppercase tracking-wider block">Threat Defense</span>
          </div>
        </div>

        {/* Nav List */}
        <nav className="flex-1 px-3 py-5 space-y-6 overflow-y-auto">
          {navGroups.map((group) => (
            <div key={group.label}>
              <h3 className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">
                {group.label}
              </h3>
              <div className="space-y-1">
                {group.items.map(({ href, label, icon: Icon }) => {
                  const active =
                    pathname === href ||
                    (href !== "/app" && pathname.startsWith(href + "/"));
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150",
                        active
                          ? "bg-blue-50 text-blue-700 font-bold border border-blue-200/70 shadow-2xs"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                      )}
                    >
                      {active ? (
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)] shrink-0" />
                      ) : (
                        <Icon className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                      <span>{label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom Status Box */}
        <div className="p-3.5 m-3 mt-auto bg-slate-50 rounded-xl border border-slate-200/80">
          <div className="flex justify-between items-center text-xs text-slate-600 font-medium">
            <div className="flex flex-col gap-0.5">
              <span className="font-mono text-[11px] font-bold text-slate-800">Uptime: 99.8%</span>
              <span className="font-mono text-[10px] text-slate-400">Model v1.0.3 · Online</span>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          </div>
        </div>
      </aside>

      {/* Mobile Nav */}
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
