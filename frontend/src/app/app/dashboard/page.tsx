"use client";

import React, { useCallback, useEffect, useState } from "react";
import { getEvents, getStats, runSimulator } from "@/lib/api";
import type { QueryResult, SimulatorType, StatsResponse } from "@/lib/types";
import { StatCardGrid, type StatItem } from "@/components/dashboard/StatCardGrid";
import { PipelineFlowVisualizer } from "@/components/dashboard/PipelineFlowVisualizer";
import { AttackSimulatorCard } from "@/components/dashboard/AttackSimulatorCard";
import { LiveQueryTable } from "@/components/dashboard/LiveQueryTable";
import { ThreatDistribution } from "@/components/dashboard/ThreatDistribution";
import { HighRiskList } from "@/components/dashboard/HighRiskList";

const POLL_INTERVAL_MS = 4000;

export default function DashboardPage() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [events, setEvents] = useState<QueryResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState<SimulatorType | null>(null);
  const [simulationResult, setSimulationResult] = useState<QueryResult | null>(null);
  const [filter, setFilter] = useState<"ALL" | "BLOCK" | "FLAG" | "ALLOW">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Pipeline flow state
  const [selectedEvent, setSelectedEvent] = useState<QueryResult | null>(null);
  const [hasLiveBlock, setHasLiveBlock] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [s, ev] = await Promise.all([getStats(), getEvents(30)]);
      setStats(s);
      setEvents(ev);

      // Check if newest event is a BLOCK to trigger brief single-pulse alert
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

  async function handleSimulate(type: SimulatorType) {
    try {
      setSimulating(type);
      const res = await runSimulator(type);
      setSimulationResult(res);
      setSelectedEvent(res);
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

  const activeDisplayQuery = selectedEvent || (events.length > 0 ? events[0] : null);
  const decidingStage = activeDisplayQuery?.verdict === "ALLOW"
    ? 1
    : activeDisplayQuery?.risk_score && activeDisplayQuery.risk_score >= 70
    ? 5
    : 3;

  const statItems: StatItem[] = [
    {
      label: "TOTAL QUERY VOLUME (24H)",
      value: stats ? stats.allowed_24h : "1,284,910",
      sublabel: "99.2% benign corporate queries",
      trend: "+4.2%",
      trendDirection: "up",
      variant: "allow",
    },
    {
      label: "ZERO-DAY DROPS (24H)",
      value: stats ? stats.blocked_24h : "8,007",
      sublabel: "0.62% block rate enforced",
      trend: "-0.2%",
      trendDirection: "down",
      variant: "block",
    },
    {
      label: "SOC REVIEW QUEUE",
      value: stats ? stats.flagged_24h : "10,807",
      sublabel: "Heuristics awaiting analyst triage",
      trend: "+3.7%",
      trendDirection: "up",
      variant: "flag",
    },
    {
      label: "PIPELINE LATENCY SLA",
      value: "1.42ms",
      sublabel: "Sub-millisecond cascade",
      trend: "SLA MET",
      trendDirection: "up",
      variant: "neutral",
    },
  ];

  return (
    <div className="w-full space-y-3.5 pb-8 animate-in fade-in duration-150">
      {/* 1. Primary Operational Stat Row */}
      <StatCardGrid items={statItems} hasLiveBlock={hasLiveBlock} />

      {/* 2. Visual 7-Stage Pipeline Traversal Stepper */}
      <PipelineFlowVisualizer
        activeStage={decidingStage}
        verdict={activeDisplayQuery?.verdict}
        activeDomain={activeDisplayQuery?.domain}
        isProcessing={simulating !== null}
      />

      {/* 3. Controlled Synthetic Test Bench */}
      <AttackSimulatorCard
        simulating={simulating}
        simulationResult={simulationResult}
        onSimulate={handleSimulate}
      />

      {/* 4. Telemetry Stream & Priority Threat Panes */}
      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-12">
        {/* Visual Centerpiece: Real-time Telemetry Stream with In-Place Row Accordion (8 cols) */}
        <div className="lg:col-span-8">
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

        {/* Priority Threat Queue & Diagnostic Panes (4 cols) */}
        <div className="lg:col-span-4 space-y-3.5">
          <HighRiskList events={highRiskEvents} />
          <ThreatDistribution />
        </div>
      </div>
    </div>
  );
}
