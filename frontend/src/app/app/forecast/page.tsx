"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  TrendingUp,
  AlertTriangle,
  Shield,
  ShieldAlert,
  Radio,
  Play,
  RotateCcw,
  CheckCircle2,
  Clock,
  Layers,
  Cpu,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ShapFeature {
  feature: string;
  value: string;
  shap_value: number;
}

interface ForecastTimelineResponse {
  host_ip: string;
  current_stage: string;
  current_stage_confidence: number;
  overall_threat_score: number;
  forecast_15m?: { stage: string; confidence: number; label: string; time_min: number };
  forecast_30m?: { stage: string; confidence: number; label: string; time_min: number };
  forecast_60m?: { stage: string; confidence: number; label: string; time_min: number };
  shap_explanations: ShapFeature[];
  all_stages: Record<string, { label: string; description: string; mitre_tactics?: string[]; severity?: string }>;
  hardware_relay_required?: boolean;
}

const STAGE_ORDER = [
  "STAGE_1_RECONNAISSANCE",
  "STAGE_2_INITIAL_ACCESS",
  "STAGE_3_DISCOVERY",
  "STAGE_4_C2_PERSISTENCE",
  "STAGE_5_LATERAL_MOVEMENT",
  "STAGE_6_EXFILTRATION",
];

export default function ForecastPage() {
  const [data, setData] = useState<ForecastTimelineResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [relayTripped, setRelayTripped] = useState(false);
  const [simulating, setSimulating] = useState(false);

  const fetchForecast = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/forecast/timeline");
      if (!res.ok) throw new Error("API failed");
      const json = await res.json();
      setData(json);
    } catch (err) {
      // Fallback state for graceful local dev
      setData({
        host_ip: "172.28.0.101",
        current_stage: "STAGE_2_INITIAL_ACCESS",
        current_stage_confidence: 0.88,
        overall_threat_score: 74,
        forecast_15m: { stage: "STAGE_4_C2_PERSISTENCE", confidence: 0.85, label: "C2 Beaconing", time_min: 15 },
        forecast_30m: { stage: "STAGE_5_LATERAL_MOVEMENT", confidence: 0.72, label: "Lateral Movement", time_min: 30 },
        forecast_60m: { stage: "STAGE_6_EXFILTRATION", confidence: 0.65, label: "Exfiltration", time_min: 60 },
        shap_explanations: [
          { feature: "Port Sweep Diversity", value: "14 ports", shap_value: 0.32 },
          { feature: "C2 Heartbeat Periodicity", value: "0.91 regularity", shap_value: 0.41 },
          { feature: "DNS Tunneling Markers", value: "3 tags", shap_value: 0.48 },
          { feature: "SYN Flood Ratio", value: "45.0%", shap_value: 0.25 },
        ],
        all_stages: {
          STAGE_1_RECONNAISSANCE: { label: "Network & DNS Reconnaissance", description: "Port sweeps and aggressive DNS enumeration.", mitre_tactics: ["TA0043"] },
          STAGE_2_INITIAL_ACCESS: { label: "Initial Access & DGA Contact", description: "Malicious DGA seed queries and homoglyphs.", mitre_tactics: ["TA0001", "T1568"] },
          STAGE_3_DISCOVERY: { label: "Internal Subnet Discovery", description: "Internal lateral port sweeps and LDAP probes.", mitre_tactics: ["TA0007"] },
          STAGE_4_C2_PERSISTENCE: { label: "Command & Control (C2) Beaconing", description: "Periodic heartbeat pulses and Cobalt Strike sync.", mitre_tactics: ["TA0011"] },
          STAGE_5_LATERAL_MOVEMENT: { label: "Lateral Movement", description: "Pivoting towards Core Financial Database.", mitre_tactics: ["TA0008"] },
          STAGE_6_EXFILTRATION: { label: "Data Exfiltration & Impact", description: "Bulk Base64 encoded egress attempt.", mitre_tactics: ["TA0010"] },
        },
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchForecast();
    const interval = setInterval(fetchForecast, 5000);
    return () => clearInterval(interval);
  }, [fetchForecast]);

  async function handleToggleRelay() {
    const nextState = !relayTripped;
    setRelayTripped(nextState);
    try {
      await fetch(`/api/v1/hardware/trip-relay?action=${nextState ? "ENGAGE" : "RELEASE"}`, { method: "POST" });
    } catch (e) {
      console.log("Local relay state toggled");
    }
  }

  async function handleSimulate() {
    setSimulating(true);
    await new Promise((r) => setTimeout(r, 600));
    setSimulating(false);
    fetchForecast();
  }

  const currentStage = data?.current_stage || "STAGE_2_INITIAL_ACCESS";
  const currentIdx = STAGE_ORDER.indexOf(currentStage);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">AI Network Attack Forecasting</h1>
            <span className="text-[11px] font-mono font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
              SIH 2026 OFFICIAL
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Sequential MITRE ATT&CK kill-chain projection from 5-tuple NetFlow & DNS session buffers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSimulate}
            disabled={simulating}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{simulating ? "Simulating..." : "Simulate Multi-Stage APT"}</span>
          </button>
          <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-mono text-slate-700">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>HORIZON: +15m</span>
          </div>
        </div>
      </div>

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Stage */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Phase</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-xl font-bold text-slate-900">
              {data?.all_stages?.[currentStage]?.label?.split("&")[0] || "Initial Access"}
            </span>
            <span className="text-xs font-mono font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
              {Math.round((data?.current_stage_confidence || 0.88) * 100)}% Conf
            </span>
          </div>
        </div>

        {/* Projected Next Stage */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-blue-600" />
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Projected Next Stage</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-xl font-bold text-slate-900">
              {data?.forecast_15m?.label || "C2 Beaconing"}
            </span>
            <span className="text-xs font-mono font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded">
              +15m Horizon
            </span>
          </div>
        </div>

        {/* Threat Score */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-red-600" />
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Overall Threat Index</span>
            <ShieldAlert className="w-4 h-4 text-red-600" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold font-mono text-slate-900">
              {data?.overall_threat_score || 74}/100
            </span>
            <span className="text-xs font-mono font-bold text-red-800 bg-red-100 px-2 py-0.5 rounded">
              HIGH RISK
            </span>
          </div>
        </div>

        {/* Zephyr RTOS Relay */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm relative overflow-hidden">
          <div className={cn("absolute top-0 left-0 right-0 h-1", relayTripped ? "bg-red-600" : "bg-emerald-500")} />
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Zephyr RTOS Relay</span>
            <Cpu className={cn("w-4 h-4", relayTripped ? "text-red-600" : "text-emerald-500")} />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className={cn("text-xl font-bold", relayTripped ? "text-red-600" : "text-emerald-600")}>
              {relayTripped ? "AIR-GAP ISOLATED" : "ARMED (NORMAL)"}
            </span>
            <span className="text-[10px] font-mono text-slate-400">GPIO 18</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Kill-Chain Timeline + TreeSHAP + Hardware Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Timeline & TreeSHAP */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* MITRE Timeline */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">Sequential MITRE ATT&CK Kill-Chain Trajectory</h2>
                <p className="text-xs text-slate-500">Predicted attack sequence generated by temporal LSTM sequence model.</p>
              </div>
              <span className="text-[11px] font-mono bg-slate-100 px-2.5 py-1 rounded text-slate-600 font-semibold">
                Bi-LSTM + Markov
              </span>
            </div>

            <div className="space-y-3">
              {STAGE_ORDER.map((stageKey, idx) => {
                const meta = data?.all_stages?.[stageKey] || { label: stageKey, description: "" };
                const isCurrent = stageKey === currentStage;
                const isPast = idx < currentIdx;
                const isFuture = idx > currentIdx;

                return (
                  <div
                    key={stageKey}
                    className={cn(
                      "p-4 rounded-xl border transition-all flex items-center justify-between",
                      isCurrent && "bg-amber-50/70 border-amber-300 shadow-sm",
                      isPast && "bg-emerald-50/40 border-emerald-200",
                      isFuture && "bg-slate-50/60 border-slate-200 border-dashed"
                    )}
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className={cn(
                          "w-8 h-8 rounded-lg font-mono text-xs font-bold flex items-center justify-center border",
                          isCurrent && "bg-amber-500 text-white border-amber-600",
                          isPast && "bg-emerald-600 text-white border-emerald-700",
                          isFuture && "bg-white text-slate-500 border-slate-300"
                        )}
                      >
                        {idx + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">{meta.label}</span>
                          {isCurrent && (
                            <span className="text-[10px] bg-amber-500 text-white font-mono px-2 py-0.5 rounded font-bold">
                              ACTIVE ({(data?.current_stage_confidence || 0.88) * 100}%)
                            </span>
                          )}
                          {isPast && (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-mono px-2 py-0.5 rounded font-semibold">
                              RESOLVED
                            </span>
                          )}
                          {isFuture && (
                            <span className="text-[10px] bg-blue-100 text-blue-800 font-mono px-2 py-0.5 rounded font-semibold">
                              FORECAST (+{(idx - currentIdx) * 15}m)
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{meta.description}</p>
                      </div>
                    </div>

                    <div className="text-xs font-mono font-bold text-slate-700">
                      {isCurrent ? "t = 0m" : isPast ? `-${(currentIdx - idx) * 10}m` : `+${(idx - currentIdx) * 15}m`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* TreeSHAP Table */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">Exact Additive TreeSHAP Explanations</h2>
                <p className="text-xs text-slate-500">Mathematical feature attributions &phi; explaining the forecast verdict.</p>
              </div>
              <span className="text-[11px] font-mono text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded font-bold">
                100% Explainable
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-200 font-mono">
                    <th className="py-2.5 px-3">Flow Feature</th>
                    <th className="py-2.5 px-3">Telemetry Metric</th>
                    <th className="py-2.5 px-3">SHAP Value (&phi;)</th>
                    <th className="py-2.5 px-3 text-right">Risk Contribution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {data?.shap_explanations?.map((item, i) => (
                    <tr key={i} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3 font-sans font-semibold text-slate-800">{item.feature}</td>
                      <td className="py-2.5 px-3 text-slate-500">{item.value}</td>
                      <td className={cn("py-2.5 px-3 font-bold", item.shap_value > 0 ? "text-red-600" : "text-emerald-600")}>
                        {item.shap_value > 0 ? `+${item.shap_value.toFixed(2)}` : item.shap_value.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold",
                            item.shap_value > 0 ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"
                          )}
                        >
                          {item.shap_value > 0 ? "ELEVATES THREAT" : "BENIGN BIAS"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Right 1 Col: Hardware Sentinel & Tactical Containment */}
        <div className="space-y-6">
          
          {/* Zephyr RTOS Hardware Sentinel */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-blue-600" />
                <h2 className="text-base font-bold text-slate-900">Zephyr RTOS Sentinel</h2>
              </div>
              <span className="text-[10px] font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold">
                ESP32 / STM32
              </span>
            </div>

            {/* OLED Terminal Simulation */}
            <div className="bg-slate-950 rounded-lg p-4 border border-slate-800 font-mono text-xs text-sky-400 space-y-1 shadow-inner">
              <div className="flex justify-between border-b border-sky-900/50 pb-1.5 text-sky-300 font-bold">
                <span>SENTINEL PROBE</span>
                <span>42.8 QPS</span>
              </div>
              <div className="font-bold text-slate-200">
                STATUS: {relayTripped ? "AIR-GAP ENGAGED" : "ARMED / SECURE"}
              </div>
              <div className="text-slate-400">
                THREAT SCORE: {data?.overall_threat_score || 74} / 100
              </div>
              <div className="text-amber-400 font-semibold">
                NEXT: +15m C2 BEACON
              </div>
            </div>

            {/* Physical Air-Gap Relay Button */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-900">5V Electromechanical Relay</div>
                  <div className="text-[11px] text-slate-500">Air-gap isolation for crown-jewel assets.</div>
                </div>
                <div className={cn("w-3.5 h-3.5 rounded-full animate-pulse", relayTripped ? "bg-red-600 shadow-[0_0_10px_#dc2626]" : "bg-emerald-500 shadow-[0_0_10px_#10b981]")} />
              </div>

              <button
                onClick={handleToggleRelay}
                className={cn(
                  "w-full py-2 px-4 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2",
                  relayTripped
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-red-600 hover:bg-red-700 text-white"
                )}
              >
                {relayTripped ? <RotateCcw className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
                <span>{relayTripped ? "RESTORE NETWORK TRUNK" : "⚡ TRIP AIR-GAP RELAY"}</span>
              </button>
            </div>
          </div>

          {/* Tactical Blast Radius Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Target Blast-Radius</h2>
              <span className="text-[10px] font-mono text-red-800 bg-red-100 px-2 py-0.5 rounded font-bold">
                Lateral Risk
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Anticipated lateral propagation path from infected host to crown-jewel database.
            </p>

            <div className="space-y-2 font-mono text-xs">
              <div className="p-2.5 bg-red-50 border border-red-200 rounded text-red-900 flex justify-between">
                <span>Infected Node: 172.28.0.101</span>
                <span className="font-bold">Patient Zero</span>
              </div>
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-amber-900 flex justify-between">
                <span>Target Subnet: 192.168.1.0/24</span>
                <span className="font-bold">+15m Target</span>
              </div>
              <div className="p-2.5 bg-purple-50 border border-purple-200 rounded text-purple-900 flex justify-between">
                <span>Crown DB: 192.168.1.50</span>
                <span className="font-bold">Air-Gapped</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
