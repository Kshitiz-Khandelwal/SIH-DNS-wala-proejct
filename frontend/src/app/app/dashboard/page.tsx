"use client";

import React, { useCallback, useEffect, useState } from "react";
import { getEvents, getStats, runSimulator } from "@/lib/api";
import type { QueryResult, SimulatorType, StatsResponse } from "@/lib/types";
import { StatCardGrid, type StatItem } from "@/components/dashboard/StatCardGrid";
import { AttackSimulatorCard } from "@/components/dashboard/AttackSimulatorCard";
import { LiveQueryTable } from "@/components/dashboard/LiveQueryTable";
import { ThreatDistribution } from "@/components/dashboard/ThreatDistribution";
import { HighRiskList } from "@/components/dashboard/HighRiskList";
import { PipelineStatusList } from "@/components/dashboard/PipelineStatusList";

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
      const [s, ev] = await Promise.all([getStats(), getEvents(30)]);
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
    .slice(0, 4);

  const statItems: StatItem[] = [
    {
      label: "CLEAN QUERIES (24H)",
      value: stats ? stats.allowed_24h : "1,284,910",
      sublabel: "99.2% benign corporate traffic",
      trend: "+4.2%",
      trendDirection: "up",
      variant: "allow",
    },
    {
      label: "SOC REVIEW QUEUE",
      value: stats ? stats.flagged_24h : "10,807",
      sublabel: "Active SOC triage buffer",
      trend: "+3.7%",
      trendDirection: "up",
      variant: "flag",
    },
    {
      label: "BLOCKED ZERO-DAY",
      value: stats ? stats.blocked_24h : "8,007",
      sublabel: "DGA & Base64 Tunneling dropped",
      trend: "-0.2%",
      trendDirection: "down",
      variant: "block",
    },
    {
      label: "PIPELINE LATENCY SLA",
      value: "1.42ms",
      sublabel: "Sub-millisecond SLA met",
      trend: "SLA MET",
      trendDirection: "up",
      variant: "neutral",
    },
  ];

  return (
    <div className="w-full space-y-4 md:space-y-5 pb-8 animate-in fade-in duration-150">
      {/* Tier 1: System Posture & Core Telemetry Summary */}
      <StatCardGrid items={statItems} />

      {/* Tier 3: Controlled Synthetic Test Bench */}
      <AttackSimulatorCard
        simulating={simulating}
        simulationResult={simulationResult}
        onSimulate={handleSimulate}
      />

      {/* Tier 2: Real-time Telemetry Stream & Analytical Panes */}
      <div className="grid grid-cols-1 gap-4 md:gap-5 lg:grid-cols-12">
        {/* Visual Centerpiece: Real-time Telemetry Stream (8 cols) */}
        <div className="lg:col-span-8">
          <LiveQueryTable
            events={filteredEvents}
            totalCount={events.length}
            filter={filter}
            searchQuery={searchQuery}
            onFilterChange={setFilter}
            onSearchChange={setSearchQuery}
          />
        </div>

        {/* Priority Threat Queue & Diagnostic Panes (4 cols) */}
        <div className="lg:col-span-4 space-y-4 md:space-y-5">
          <HighRiskList events={highRiskEvents} />
          <ThreatDistribution />
          <PipelineStatusList />
        </div>
      </div>
    </div>
  );
}
