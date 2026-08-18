"use client";

import { useState } from "react";
import {
  Monitor,
  ShieldAlert,
  ShieldCheck,
  Search,
  ArrowRight,
  Filter,
  Laptop,
  Server,
  Smartphone,
  Wifi,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DeviceHost {
  id: string;
  name: string;
  ip: string;
  type: "Workstation" | "Server" | "Mobile" | "IoT Device";
  mac: string;
  totalQueries: number;
  blockedQueries: number;
  riskStatus: "Clean" | "Suspicious" | "Compromised";
  lastSeen: string;
}

const SAMPLE_DEVICES: DeviceHost[] = [
  {
    id: "dev-01",
    name: "CORP-LAPTOP-104",
    ip: "10.0.0.88",
    type: "Workstation",
    mac: "00:1A:2B:3C:4D:5E",
    totalQueries: 1420,
    blockedQueries: 48,
    riskStatus: "Compromised",
    lastSeen: "Just now",
  },
  {
    id: "dev-02",
    name: "AUTH-PROD-SRV-02",
    ip: "10.0.0.91",
    type: "Server",
    mac: "00:50:56:A1:B2:C3",
    totalQueries: 4890,
    blockedQueries: 12,
    riskStatus: "Suspicious",
    lastSeen: "2 mins ago",
  },
  {
    id: "dev-03",
    name: "ENG-MACBOOK-PRO-09",
    ip: "192.168.1.22",
    type: "Workstation",
    mac: "F4:D4:88:99:AA:BB",
    totalQueries: 890,
    blockedQueries: 0,
    riskStatus: "Clean",
    lastSeen: "4 mins ago",
  },
  {
    id: "dev-04",
    name: "INFRA-DNS-FORWARDER",
    ip: "192.168.1.10",
    type: "Server",
    mac: "00:0C:29:4F:8E:91",
    totalQueries: 12450,
    blockedQueries: 0,
    riskStatus: "Clean",
    lastSeen: "1 min ago",
  },
  {
    id: "dev-05",
    name: "GUEST-WIFI-CLIENT-33",
    ip: "172.16.4.112",
    type: "Mobile",
    mac: "AC:BC:32:D4:E5:F6",
    totalQueries: 240,
    blockedQueries: 3,
    riskStatus: "Suspicious",
    lastSeen: "8 mins ago",
  },
];

export default function DevicesPage() {
  const [devices, setDevices] = useState<DeviceHost[]>(SAMPLE_DEVICES);
  const [filter, setFilter] = useState<"ALL" | "Compromised" | "Suspicious" | "Clean">("ALL");
  const [search, setSearch] = useState("");

  const filtered = devices.filter((d) => {
    if (filter !== "ALL" && d.riskStatus !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        d.name.toLowerCase().includes(q) ||
        d.ip.toLowerCase().includes(q) ||
        d.mac.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const compromisedCount = devices.filter((d) => d.riskStatus === "Compromised").length;
  const suspiciousCount = devices.filter((d) => d.riskStatus === "Suspicious").length;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl font-sans">
              Device Fleet Monitoring
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-semibold text-blue-700">
              <Monitor className="h-3.5 w-3.5" /> {devices.length} Tracked Hosts
            </span>
          </div>
          <p className="mt-1.5 text-sm text-slate-600">
            Per-host DNS traffic profiling, quarantine isolation, and infected endpoint attribution.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
            ACTIVE CLIENTS
          </span>
          <div className="font-mono text-3xl font-bold text-slate-900 mt-2">
            {devices.length}
          </div>
          <p className="mt-3 text-xs text-slate-500 border-t border-slate-100 pt-2.5">
            Internal subnets 10.0.0.0/8 &amp; 192.168.0.0/16
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
            COMPROMISED HOSTS
          </span>
          <div className="font-mono text-3xl font-bold text-rose-700 mt-2">
            {compromisedCount}
          </div>
          <p className="mt-3 text-xs text-rose-600 border-t border-slate-100 pt-2.5 font-medium">
            Active DGA / C2 beacon signals
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
            SUSPICIOUS HOSTS
          </span>
          <div className="font-mono text-3xl font-bold text-amber-700 mt-2">
            {suspiciousCount}
          </div>
          <p className="mt-3 text-xs text-amber-600 border-t border-slate-100 pt-2.5 font-medium">
            High-entropy DNS exfiltration anomaly
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
            HEALTHY CLIENTS
          </span>
          <div className="font-mono text-3xl font-bold text-emerald-700 mt-2">
            {devices.length - compromisedCount - suspiciousCount}
          </div>
          <p className="mt-3 text-xs text-emerald-600 border-t border-slate-100 pt-2.5 font-medium">
            100% clean query traffic
          </p>
        </div>
      </div>

      {/* Fleet Table */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
              ENDPOINT REGISTRY
            </span>
            <h2 className="text-base font-bold text-slate-900 mt-0.5">
              Monitored Client IP Addresses
            </h2>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Search */}
            <div className="relative min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search hostname or IP…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-9 rounded-full border border-slate-200 bg-slate-50/80 pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5">
              {(["ALL", "Compromised", "Suspicious", "Clean"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "px-3 py-1 rounded-full text-[11px] font-semibold font-mono border transition-all",
                    filter === f
                      ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                      : "text-slate-500 bg-transparent border-slate-200 hover:border-slate-300 hover:text-slate-700"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-mono">
                <th className="pb-2 font-medium">Hostname</th>
                <th className="pb-2 font-medium">Client IP</th>
                <th className="pb-2 font-medium">Device Type</th>
                <th className="pb-2 font-medium">Total Queries</th>
                <th className="pb-2 font-medium">Threats Blocked</th>
                <th className="pb-2 font-medium">Risk Status</th>
                <th className="pb-2 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50/50">
                  <td className="py-3 font-semibold text-slate-900 flex items-center gap-2">
                    {d.type === "Server" ? (
                      <Server className="h-4 w-4 text-blue-600 shrink-0" />
                    ) : d.type === "Mobile" ? (
                      <Smartphone className="h-4 w-4 text-purple-600 shrink-0" />
                    ) : (
                      <Laptop className="h-4 w-4 text-slate-500 shrink-0" />
                    )}
                    {d.name}
                  </td>
                  <td className="py-3 font-mono font-semibold text-slate-700">{d.ip}</td>
                  <td className="py-3 text-slate-500">{d.type}</td>
                  <td className="py-3 font-mono text-slate-900 font-bold">{d.totalQueries.toLocaleString()}</td>
                  <td className="py-3 font-mono font-bold text-rose-600">
                    {d.blockedQueries > 0 ? d.blockedQueries : "0"}
                  </td>
                  <td className="py-3">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 font-mono text-[10px] font-semibold px-2.5 py-0.5 rounded-full border",
                        d.riskStatus === "Compromised"
                          ? "bg-rose-50 border-rose-200 text-rose-700"
                          : d.riskStatus === "Suspicious"
                          ? "bg-amber-50 border-amber-200 text-amber-700"
                          : "bg-emerald-50 border-emerald-200 text-emerald-700"
                      )}
                    >
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          d.riskStatus === "Compromised"
                            ? "bg-rose-500"
                            : d.riskStatus === "Suspicious"
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                        )}
                      />
                      {d.riskStatus}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    {d.riskStatus !== "Clean" ? (
                      <button
                        type="button"
                        onClick={() => alert(`Isolating ${d.name} (${d.ip}) via DHCP / firewall quarantine rule.`)}
                        className="rounded-full bg-rose-50 border border-rose-200 px-3 py-1 font-mono text-[10px] font-bold text-rose-700 hover:bg-rose-100 transition shadow-2xs"
                      >
                        Quarantine
                      </button>
                    ) : (
                      <span className="font-mono text-[11px] text-slate-400">Normal</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
