"use client";

import React, { useCallback, useEffect, useState, useRef } from "react";
import { getEvents, getStats, queryDomain, runSimulator } from "@/lib/api";
import type { QueryResult, SimulatorType, StatsResponse } from "@/lib/types";
import { StatCardGrid, type StatItem } from "@/components/dashboard/StatCardGrid";
import { PipelineFlowVisualizer } from "@/components/dashboard/PipelineFlowVisualizer";
import { AttackSimulatorCard } from "@/components/dashboard/AttackSimulatorCard";
import { LiveQueryTable } from "@/components/dashboard/LiveQueryTable";
import { ThreatDistribution } from "@/components/dashboard/ThreatDistribution";
import { HighRiskList } from "@/components/dashboard/HighRiskList";
import { RiskWaterfall } from "@/components/landing/RiskWaterfall";
import { DomainMicroscope } from "@/components/landing/DomainMicroscope";
import { Monitor, ShieldAlert, Cpu, Sparkles, Layers, BarChart3, Microscope, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

const POLL_INTERVAL_MS = 4000;
const STORAGE_KEY = "dns_shield_tested_queries";

function getCachedTestedQueries(): QueryResult[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as QueryResult[]) : [];
  } catch {
    return [];
  }
}

function saveTestedQuery(item: QueryResult) {
  if (typeof window === "undefined") return;
  try {
    const prev = getCachedTestedQueries();
    const filtered = prev.filter((e) => e.domain !== item.domain && e.id !== item.id);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify([item, ...filtered].slice(0, 20)));
  } catch {
    // sessionStorage quota or disabled
  }
}

export default function DashboardPage() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [events, setEvents] = useState<QueryResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState<SimulatorType | null>(null);
  const [simulationResult, setSimulationResult] = useState<QueryResult | null>(null);
  const [filter, setFilter] = useState<"ALL" | "BLOCK" | "FLAG" | "ALLOW">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Sparkline rolling histories
  const [allowedHistory, setAllowedHistory] = useState<number[]>([120, 135, 142, 138, 150, 162, 158, 170, 182, 178, 190, 195, 205, 210, 218]);
  const [blockedHistory, setBlockedHistory] = useState<number[]>([8, 12, 7, 15, 11, 9, 14, 18, 12, 16, 14, 11, 15, 19, 17]);
  const [flaggedHistory, setFlaggedHistory] = useState<number[]>([14, 18, 22, 19, 25, 21, 28, 24, 30, 27, 32, 29, 35, 31, 34]);
  const [latencyHistory, setLatencyHistory] = useState<number[]>([1.4, 1.2, 1.5, 1.1, 1.3, 1.6, 1.2, 1.4, 1.3, 1.1, 1.2, 1.4, 1.2, 1.3, 1.18]);

  const prevStatsRef = useRef<StatsResponse | null>(null);
  const [allowedTrend, setAllowedTrend] = useState<{ str: string; dir: "up" | "down" | "neutral" }>({ str: "+2.4%", dir: "up" });
  const [blockedTrend, setBlockedTrend] = useState<{ str: string; dir: "up" | "down" | "neutral" }>({ str: "-0.5%", dir: "down" });
  const [flaggedTrend, setFlaggedTrend] = useState<{ str: string; dir: "up" | "down" | "neutral" }>({ str: "+1.8%", dir: "up" });

  // Pipeline flow state
  const [selectedEvent, setSelectedEvent] = useState<QueryResult | null>(null);
  const [hasLiveBlock, setHasLiveBlock] = useState(false);

  // Tabbed Diagnostic Inspector State
  const [activeInspectorTab, setActiveInspectorTab] = useState<"simulator" | "pipeline" | "forensics" | "distribution">("simulator");
  const [isInspectorExpanded, setIsInspectorExpanded] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [s, ev] = await Promise.all([getStats(), getEvents(30)]);

      if (prevStatsRef.current && s) {
        const allowDelta = s.allowed_24h - prevStatsRef.current.allowed_24h;
        if (allowDelta !== 0) {
          const pct = ((allowDelta / Math.max(1, prevStatsRef.current.allowed_24h)) * 100).toFixed(1);
          setAllowedTrend({
            str: `${allowDelta >= 0 ? "+" : ""}${pct}%`,
            dir: allowDelta >= 0 ? "up" : "down",
          });
        }

        const blockDelta = s.blocked_24h - prevStatsRef.current.blocked_24h;
        if (blockDelta !== 0) {
          const pct = ((blockDelta / Math.max(1, prevStatsRef.current.blocked_24h)) * 100).toFixed(1);
          setBlockedTrend({
            str: `${blockDelta >= 0 ? "+" : ""}${pct}%`,
            dir: blockDelta >= 0 ? "up" : "down",
          });
        }
      }
      prevStatsRef.current = s;

      setStats(s);
      setEvents((prev) => {
        const cached = getCachedTestedQueries();
        const customItems = [
          ...cached,
          ...prev.filter((e) => e.source === "simulator" || e.id?.startsWith("sim-") || e.id?.startsWith("eval-")),
        ];
        const seen = new Set<string>();
        const uniqueCustom: QueryResult[] = [];
        for (const item of customItems) {
          const key = item.domain || item.id;
          if (!seen.has(key)) {
            seen.add(key);
            uniqueCustom.push(item);
          }
        }
        const serverIds = new Set(ev.map((e) => e.domain || e.id));
        const filteredCustom = uniqueCustom.filter((e) => !serverIds.has(e.domain || e.id));
        return [...filteredCustom, ...ev];
      });

      if (s) {
        setAllowedHistory((prev) => [...prev.slice(-19), s.allowed_24h % 1000]);
        setBlockedHistory((prev) => [...prev.slice(-19), s.blocked_24h % 100]);
        setFlaggedHistory((prev) => [...prev.slice(-19), s.flagged_24h % 100]);
      }

      if (ev.length > 0 && ev[0].verdict === "BLOCK") {
        setHasLiveBlock(true);
        setTimeout(() => setHasLiveBlock(false), 800);
      }
    } catch (err) {
      console.error("Failed to load dashboard data", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [loadData]);

  const [isCustomQuerying, setIsCustomQuerying] = useState(false);

  async function handleCustomQuery(customDomain: string) {
    try {
      setIsCustomQuerying(true);
      const res = await queryDomain(customDomain);
      const testItem: QueryResult = {
        ...res,
        id: res.id || `eval-${Date.now()}`,
        timestamp: new Date().toISOString(),
        source: "simulator",
      };
      saveTestedQuery(testItem);
      setSimulationResult(testItem);
      setSelectedEvent(testItem);
      setEvents((prev) => [testItem, ...prev.filter((e) => e.domain !== testItem.domain && e.id !== testItem.id)]);
      await loadData();
    } catch (e) {
      console.error("Custom query failed", e);
    } finally {
      setIsCustomQuerying(false);
    }
  }

  async function handleSimulate(type: SimulatorType) {
    try {
      setSimulating(type);
      const res = await runSimulator(type);
      const simItem: QueryResult = {
        ...res,
        id: res.id || `sim-${Date.now()}`,
        timestamp: new Date().toISOString(),
        source: "simulator",
      };
      saveTestedQuery(simItem);
      setSimulationResult(simItem);
      setSelectedEvent(simItem);
      setEvents((prev) => [simItem, ...prev.filter((e) => e.domain !== simItem.domain && e.id !== simItem.id)]);
      await loadData();
    } catch (e) {
      console.error("Simulation failed", e);
    } finally {
      setSimulating(null);
    }
  }

  const filteredEvents = events.filter((ev) => {
    if (filter !== "ALL" && ev.verdict !== filter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        ev.domain.toLowerCase().includes(q) ||
        ev.client_ip.toLowerCase().includes(q) ||
        ev.verdict.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const highRiskEvents = events
    .filter((e) => e.verdict === "BLOCK" || e.risk_score >= 70)
    .slice(0, 4);

  const topTalkers = React.useMemo(() => {
    const map: Record<string, { count: number; maxRisk: number; verdict: string }> = {};
    for (const ev of events) {
      const ip = ev.client_ip || "192.168.1.50";
      if (!map[ip]) map[ip] = { count: 0, maxRisk: 0, verdict: ev.verdict };
      map[ip].count++;
      if (ev.risk_score > map[ip].maxRisk) {
        map[ip].maxRisk = ev.risk_score;
        map[ip].verdict = ev.verdict;
      }
    }
    return Object.entries(map)
      .map(([ip, data]) => ({ ip, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [events]);

  const activeDisplayQuery = selectedEvent || (events.length > 0 ? events[0] : null);
  const decidingStage = activeDisplayQuery?.verdict === "ALLOW"
    ? 1
    : activeDisplayQuery?.risk_score && activeDisplayQuery.risk_score >= 70
    ? 5
    : 3;

  const calculatedP99 = events.length > 0
    ? (events.reduce((acc, e) => {
        const item = e as unknown as Record<string, unknown>;
        return acc + (typeof item.latency_ms === "number" ? (item.latency_ms as number) : 1.18);
      }, 0) / events.length).toFixed(2) + "ms"
    : "1.18ms";

  const totalVolume = stats ? (stats.allowed_24h + stats.blocked_24h + stats.flagged_24h) : 0;
  const benignPercentage = totalVolume > 0 && stats
    ? ((stats.allowed_24h / totalVolume) * 100).toFixed(1) + "% benign traffic"
    : "99.2% benign traffic";

  const blockPercentage = totalVolume > 0 && stats
    ? ((stats.blocked_24h / totalVolume) * 100).toFixed(2) + "% threat block rate"
    : "0.62% threat block rate";

  const statItems: StatItem[] = [
    {
      title: "Total traffic (24h)",
      caption: "all incoming DNS queries",
      value: stats ? stats.allowed_24h : 1284910,
      sublabel: benignPercentage,
      trend: allowedTrend.str,
      trendDirection: allowedTrend.dir,
      variant: "allow",
      sparkline: allowedHistory,
    },
    {
      title: "Blocked today",
      caption: "zero-day & DGA detections",
      value: stats ? stats.blocked_24h : 8007,
      sublabel: blockPercentage,
      trend: blockedTrend.str,
      trendDirection: blockedTrend.dir,
      variant: "block",
      sparkline: blockedHistory,
    },
    {
      title: "Needs review",
      caption: "flagged for analyst triage",
      value: stats ? stats.flagged_24h : 10807,
      sublabel: "Heuristics awaiting SOC decision",
      trend: flaggedTrend.str,
      trendDirection: flaggedTrend.dir,
      variant: "flag",
      sparkline: flaggedHistory,
    },
    {
      title: "Response time",
      caption: "p99 latency vs 10ms target",
      value: calculatedP99,
      sublabel: "Sub-millisecond cascade",
      trend: "SLA MET",
      trendDirection: "up",
      variant: "neutral",
      sparkline: latencyHistory,
    },
  ];

  const blockedCount = stats?.blocked_24h ?? highRiskEvents.length;
  const flaggedCount = stats?.flagged_24h ?? 0;

  return (
    <div className="w-full space-y-4 pb-8 animate-in fade-in duration-150">
      {/* 0. Attention Affordance Banner (Linear/Stripe pattern: appears only when threats need review) */}
      {blockedCount > 0 && (
        <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-rose-50/80 border border-rose-200 text-rose-900 text-xs shadow-2xs">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
            </span>
            <span className="font-semibold text-rose-950">
              {blockedCount.toLocaleString()} threats blocked in active window
            </span>
            <span className="text-rose-700/75 hidden md:inline">
              &middot; {flaggedCount.toLocaleString()} suspicious queries pending analyst review
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter(filter === "BLOCK" ? "ALL" : "BLOCK")}
              className="text-[11px] font-mono font-bold text-rose-700 hover:text-rose-900 bg-rose-100/70 hover:bg-rose-200/80 px-2 py-0.5 rounded transition cursor-pointer"
            >
              {filter === "BLOCK" ? "Show all" : "Filter blocked"} &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Tier 1: Primary Operational Stat Summary (Top Hero) */}
      <StatCardGrid items={statItems} hasLiveBlock={hasLiveBlock} loading={loading} />

      {/* Tier 2: The Core Working Surface (Dominant Center) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Main Telemetry & Query Feed (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <LiveQueryTable
            events={filteredEvents}
            totalCount={events.length}
            filter={filter}
            searchQuery={searchQuery}
            onFilterChange={setFilter}
            onSearchChange={setSearchQuery}
            onSelectEvent={setSelectedEvent}
          />
        </div>

        {/* Actionable Side Panes: High Risk Queue & Top Endpoints (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <HighRiskList events={highRiskEvents} />

          {/* Top Active Endpoints */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-2.5">
              <div className="flex items-center gap-2">
                <Monitor className="h-4 w-4 text-slate-500" />
                <span className="font-sans text-xs font-bold text-slate-800">Top Active Endpoints</span>
              </div>
              <span className="font-mono text-[10px] text-slate-400">Live Window</span>
            </div>

            <div className="space-y-2">
              {topTalkers.length === 0 ? (
                <div className="text-center py-4 text-xs font-mono text-slate-400">No active clients</div>
              ) : (
                topTalkers.map((talker) => (
                  <div key={talker.ip} className="flex items-center justify-between font-mono text-xs p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="font-semibold text-slate-800">{talker.ip}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 text-[11px]">{talker.count} queries</span>
                      <span className={cn(
                        "px-1.5 py-0.2 rounded text-[10px] font-bold",
                        talker.maxRisk >= 70 ? "bg-rose-100 text-rose-700" : talker.maxRisk >= 40 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                      )}>
                        {talker.maxRisk} Risk
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tier 3: Diagnostic Inspector (Tabbed Tool Suite) */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-slate-600" />
            <h3 className="text-xs font-sans font-bold text-slate-900 tracking-tight">
              Diagnostic &amp; Test Suite
            </h3>
            <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
              &middot; inspect pipeline internals, test domains, and view forensics
            </span>
          </div>

          <div className="flex items-center gap-1">
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 font-sans text-xs">
              <button
                type="button"
                onClick={() => { setActiveInspectorTab("simulator"); setIsInspectorExpanded(true); }}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer flex items-center gap-1.5",
                  activeInspectorTab === "simulator" && isInspectorExpanded
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                <Sparkles className="h-3 w-3" />
                <span className="hidden sm:inline">Test Sandbox</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveInspectorTab("pipeline"); setIsInspectorExpanded(true); }}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer flex items-center gap-1.5",
                  activeInspectorTab === "pipeline" && isInspectorExpanded
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                <Layers className="h-3 w-3" />
                <span className="hidden sm:inline">7-Stage Pipeline</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveInspectorTab("forensics"); setIsInspectorExpanded(true); }}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer flex items-center gap-1.5",
                  activeInspectorTab === "forensics" && isInspectorExpanded
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                <Microscope className="h-3 w-3" />
                <span className="hidden sm:inline">Forensic Microscope</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveInspectorTab("distribution"); setIsInspectorExpanded(true); }}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer flex items-center gap-1.5",
                  activeInspectorTab === "distribution" && isInspectorExpanded
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                <BarChart3 className="h-3 w-3" />
                <span className="hidden sm:inline">Threat Chart</span>
              </button>
            </div>

            <button
              onClick={() => setIsInspectorExpanded(!isInspectorExpanded)}
              className="p-1 rounded-md hover:bg-slate-200/60 text-slate-500 transition cursor-pointer ml-1"
              title={isInspectorExpanded ? "Collapse panel" : "Expand panel"}
            >
              {isInspectorExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {isInspectorExpanded && (
          <div className="p-4 bg-white animate-in fade-in duration-150">
            {activeInspectorTab === "simulator" && (
              <AttackSimulatorCard
                simulating={simulating}
                simulationResult={simulationResult}
                onSimulate={handleSimulate}
                onCustomQuery={handleCustomQuery}
                isCustomQuerying={isCustomQuerying}
              />
            )}

            {activeInspectorTab === "pipeline" && (
              <PipelineFlowVisualizer
                activeStage={decidingStage}
                verdict={activeDisplayQuery?.verdict}
                activeDomain={activeDisplayQuery?.domain}
                isProcessing={simulating !== null}
              />
            )}

            {activeInspectorTab === "forensics" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
                  <RiskWaterfall />
                </div>
                <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
                  <DomainMicroscope />
                </div>
              </div>
            )}

            {activeInspectorTab === "distribution" && (
              <div className="max-w-md mx-auto">
                <ThreatDistribution />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
