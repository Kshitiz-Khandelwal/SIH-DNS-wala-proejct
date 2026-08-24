"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, RefreshCw, Zap } from "lucide-react";
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
      value: stats ? stats.allowed_24h : "1,284,910",
      sublabel: "99.2% benign corporate traffic",
      trend: "+4.2%",
      trendDirection: "up",
      variant: "allow",
    },
    {
      label: "HEURISTIC FLAGGED",
      value: stats ? stats.flagged_24h : "10,807",
      sublabel: "Active SOC review queue",
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
      sublabel: "Sub-millisecond cheap-to-expensive SLA",
      trend: "SLA MET",
      trendDirection: "up",
      variant: "neutral",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* KPI Metric Grid */}
      <StatCardGrid items={statItems} />

      {/* Red-Team Attack Simulator Harness */}
      <AttackSimulatorCard
        simulating={simulating}
        simulationResult={simulationResult}
        onSimulate={handleSimulate}
      />

      {/* Main 2-Column Bento Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Live Telemetry Stream */}
        <div className="lg:col-span-2 space-y-6">
          <LiveQueryTable
            events={filteredEvents}
            totalCount={events.length}
            filter={filter}
            searchQuery={searchQuery}
            onFilterChange={setFilter}
            onSearchChange={setSearchQuery}
          />
        </div>

        {/* Right 1 Col: Operations Bento */}
        <div className="space-y-6">
          <ThreatDistribution />
          <HighRiskList events={highRiskEvents} />
          <PipelineStatusList />
        </div>
      </div>
    </motion.div>
  );
}
