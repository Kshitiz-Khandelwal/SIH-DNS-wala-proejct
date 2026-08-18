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
      label: "CLEAN QUERIES",
      value: stats ? stats.allowed_24h : "16,971",
      sublabel: "99.2% benign corporate traffic",
      trend: "+4.2%",
      trendDirection: "up",
      variant: "allow",
    },
    {
      label: "FLAGGED",
      value: stats ? stats.flagged_24h : "10,807",
      sublabel: "Heuristic review queue",
      trend: "+3.7%",
      trendDirection: "up",
      variant: "flag",
    },
    {
      label: "BLOCKED",
      value: stats ? stats.blocked_24h : "8,007",
      sublabel: "Zero-day DGA & Tunnelling",
      trend: "-0.2%",
      trendDirection: "down",
      variant: "block",
    },
    {
      label: "TOTAL QUERIES",
      value: stats ? (stats.allowed_24h + stats.flagged_24h + stats.blocked_24h) : "20,028",
      sublabel: "Active resolver throughput",
      trend: "+4.2%",
      trendDirection: "up",
      variant: "neutral",
    },
  ];

  return (
    <div className="w-full space-y-6 pb-12">
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
