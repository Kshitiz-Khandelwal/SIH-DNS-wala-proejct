"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, RefreshCw } from "lucide-react";
import { getEvents, getStats, runSimulator } from "@/lib/api";
import type { QueryResult, SimulatorType, StatsResponse } from "@/lib/types";
import { StatCardGrid, type StatItem } from "@/components/dashboard/StatCardGrid";
import { AttackSimulatorCard } from "@/components/dashboard/AttackSimulatorCard";
import { LiveQueryTable } from "@/components/dashboard/LiveQueryTable";
import { ThreatDistribution } from "@/components/dashboard/ThreatDistribution";
import { HighRiskList } from "@/components/dashboard/HighRiskList";
import { PipelineStatusList } from "@/components/dashboard/PipelineStatusList";
import { cn } from "@/lib/utils";

const POLL_INTERVAL_MS = 4000;

export default function DashboardPage() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [events, setEvents] = useState<QueryResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState<SimulatorType | null>(null);
  const [simulationResult, setSimulationResult] = useState<QueryResult | null>(null);
  const [filter, setFilter] = useState<"ALL" | "BLOCK" | "FLAG" | "ALLOW">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [s, ev] = await Promise.all([getStats(), getEvents(25)]);
      setStats(s);
      setEvents(ev);
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

  async function handleSimulate(type: SimulatorType) {
    try {
      setSimulating(type);
      const res = await runSimulator(type);
      setSimulationResult(res);
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
    .slice(0, 5);

  const statItems: StatItem[] = [
    {
      label: "TOTAL QUERIES ALLOWED",
      value: stats ? stats.allowed_24h : 12849,
      sublabel: "99.2% clean traffic",
      trend: "+3.8%",
      trendDirection: "up",
      variant: "allow",
    },
    {
      label: "SUSPICIOUS FLAGGED",
      value: stats ? stats.flagged_24h : 344,
      sublabel: "Heuristic review queue",
      trend: "-1.4%",
      trendDirection: "down",
      variant: "flag",
    },
    {
      label: "THREATS BLOCKED",
      value: stats ? stats.blocked_24h : 92,
      sublabel: "Zero-day DGA & Tunnelling",
      trend: "+0.8%",
      trendDirection: "up",
      variant: "block",
    },
    {
      label: "ACTIVE INCIDENTS",
      value: stats ? stats.open_incidents : 17,
      sublabel: "Requires SOC review",
      trend: "0 pending",
      trendDirection: "neutral",
      variant: "neutral",
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      {/* Top Title Banner */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl font-sans">
              DNS Threat Defense Overview
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 px-3 py-1 text-xs font-semibold text-emerald-800 shadow-2xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Interceptor Active
            </span>
          </div>
          <p className="mt-1.5 text-sm text-slate-600">
            Real-time heuristic & machine learning pipeline monitoring recursive DNS queries.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadData}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs transition-all hover:bg-slate-50 hover:border-slate-300"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin text-blue-600")} />
            Refresh
          </button>
          <Link
            href="/app/queue"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-blue-700"
          >
            View Live Stream
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* 1. 4-Column Stat Cards */}
      <StatCardGrid items={statItems} />

      {/* 2. Interactive Attack Simulator Panel */}
      <AttackSimulatorCard
        simulating={simulating}
        simulationResult={simulationResult}
        onSimulate={handleSimulate}
      />

      {/* 3. 2-Column Main Content Split (65% Table / 35% Insights) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 items-start">
        {/* Left 2-Cols: Live Query Table (~65%) */}
        <div className="lg:col-span-2">
          <LiveQueryTable
            events={filteredEvents}
            totalCount={events.length}
            filter={filter}
            searchQuery={searchQuery}
            onFilterChange={setFilter}
            onSearchChange={setSearchQuery}
          />
        </div>

        {/* Right 1-Col: Insights & Engine Status (~35%) */}
        <div className="space-y-6">
          <ThreatDistribution />
          <HighRiskList events={highRiskEvents} />
          <PipelineStatusList />
        </div>
      </div>
    </div>
  );
}
