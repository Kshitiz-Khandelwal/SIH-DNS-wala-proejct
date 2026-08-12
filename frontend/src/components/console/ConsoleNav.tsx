"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Brain,
  Database,
  Globe,
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
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const navItems = [
  { href: "/app/dashboard", label: "Dashboard",    icon: LayoutDashboard },
  { href: "/app/queue",     label: "Live Queries",  icon: Radio },
  { href: "/app/pipeline",  label: "Pipeline",      icon: Zap },
  { href: "/app/threats",   label: "Threat Intel",  icon: Database },
  { href: "/app/xai",       label: "XAI Analysis",  icon: Brain },
  { href: "/app/devices",   label: "Devices",       icon: Monitor },
  { href: "/app/analytics", label: "Analytics",     icon: Activity },
  { href: "/app/reports",   label: "Reports",       icon: List },
  { href: "/app/settings",  label: "Settings",      icon: Settings },
];

export function ConsoleNav() {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-[#1a2640] bg-[#0a0e1a] md:flex" style={{ minHeight: "100vh" }}>
        {/* Logo */}
        <div className="border-b border-[#1a2640] px-5 py-4">
          <Link href="/app/queue" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded border border-[#00e5ff]/30 bg-[#00e5ff]/10">
              <Shield className="h-4 w-4 text-[#00e5ff]" style={{ filter: "drop-shadow(0 0 4px rgba(0,229,255,0.6))" }} />
            </div>
            <div>
              <span className="font-display block text-xs font-bold tracking-widest text-[#e2e8f0]">DNS SHIELD</span>
              <span className="block text-[9px] tracking-wider text-[#6b7fa0] uppercase">AI-Powered DNS Threat Defense</span>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 p-3">
          {navItems.map(({ href, label, icon: Icon }) => {
            // match /app/queue and /app/queue/... but not /app/queue-other
            const active =
              pathname === href ||
              (href !== "/app" && pathname.startsWith(href + "/")) ||
              pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-120",
                  active
                    ? "bg-[#00e5ff]/10 text-[#00e5ff] border-l-2 border-[#00e5ff]"
                    : "text-[#6b7fa0] hover:bg-[#131d30] hover:text-[#e2e8f0] border-l-2 border-transparent",
                )}
              >
                <Icon className={cn("h-3.5 w-3.5 shrink-0", active && "text-[#00e5ff]")} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* System status + version */}
        <div className="border-t border-[#1a2640] p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-[#22d3a5] pulse-dot" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[#22d3a5]">SYSTEM STATUS</span>
          </div>
          <div className="text-[11px] font-bold text-[#00e5ff]">● SECURE</div>
          <div className="text-[10px] text-[#6b7fa0] leading-5">
            DNS Shield v2.6.1<br />Build 5578
          </div>
          <div className="text-[9px] text-[#3a4d66]">© 2026 DNS Shield<br />All rights reserved.</div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 rounded px-2 py-1.5 text-[10px] text-[#6b7fa0] transition-colors hover:bg-[#131d30] hover:text-[#e2e8f0]"
          >
            <LogOut className="h-3 w-3" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-50 flex border-t border-[#1a2640] bg-[#0a0e1a] md:hidden">
        {navItems.slice(0, 5).map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-3 text-[9px]",
                active ? "text-[#00e5ff]" : "text-[#6b7fa0]",
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

export function StatusStrip() {
  const [time, setTime] = useState("");
  const [qps, setQps] = useState(12842);
  const [blocked, setBlocked] = useState(7213);
  const [uptime] = useState("47d 02:11:09");

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString("en-US", { hour12: true, hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      // simulate tiny fluctuations
      setQps((v) => v + Math.floor(Math.random() * 6 - 2));
      setBlocked((v) => v + (Math.random() > 0.85 ? 1 : 0));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="sticky top-0 z-40 flex items-center justify-between border-b border-[#1a2640] bg-[#0a0e1a]/95 px-6 py-2.5 backdrop-blur-sm">
      {/* Left — live metrics */}
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-[#00e5ff] pulse-dot" />
          <span className="text-[10px] text-[#6b7fa0]">Live Traffic</span>
          <span className="font-mono text-xs font-bold text-[#00e5ff]">{qps.toLocaleString()} QPS</span>
          <svg width="48" height="16" viewBox="0 0 48 16" className="ml-1">
            <polyline points="0,12 8,8 16,10 24,4 32,7 40,3 48,6" fill="none" stroke="#00e5ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
          </svg>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#6b7fa0]">Threats Blocked</span>
          <span className="font-mono text-xs font-bold text-[#ff3b5c]">{blocked.toLocaleString()}</span>
          <svg width="48" height="16" viewBox="0 0 48 16" className="ml-1">
            <polyline points="0,14 8,10 16,12 24,6 32,9 40,5 48,8" fill="none" stroke="#ff3b5c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
          </svg>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#6b7fa0]">Uptime</span>
          <span className="font-mono text-xs text-[#22d3a5]">{uptime}</span>
          <svg width="48" height="16" viewBox="0 0 48 16" className="ml-1">
            <polyline points="0,8 8,8 16,8 24,8 32,7 40,8 48,8" fill="none" stroke="#22d3a5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
          </svg>
        </div>
      </div>

      {/* Right — time + user */}
      <div className="flex items-center gap-5">
        <div className="text-right">
          <div className="font-mono text-sm font-bold text-[#e2e8f0]">{time}</div>
          <div className="text-[10px] text-[#6b7fa0]">
            {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </div>
        </div>
        <div className="flex items-center gap-2.5 rounded-lg border border-[#1a2640] bg-[#0e1525] px-3 py-1.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#00e5ff]/15 text-[10px] font-bold text-[#00e5ff]">
            SA
          </div>
          <div>
            <div className="text-[10px] font-semibold text-[#e2e8f0]">SOC ANALYST</div>
            <div className="text-[9px] text-[#6b7fa0]">Level 3 Access</div>
          </div>
        </div>
      </div>
    </div>
  );
}
