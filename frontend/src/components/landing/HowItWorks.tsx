"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  Database, 
  ShieldAlert, 
  FileCheck2, 
  BrainCircuit, 
  Activity, 
  Globe2, 
  ZapOff, 
  BarChart3,
  Microscope,
  SplitSquareVertical,
  Compass
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RiskWaterfall } from "./RiskWaterfall";
import { DomainMicroscope } from "./DomainMicroscope";
import { VerdictComparison } from "./VerdictComparison";
import { GeoContextStrip } from "./GeoContextStrip";

const PIPELINE_PILLARS = [
  {
    stage: 1,
    title: "Sovereign Allowlist & Redis Hot Cache",
    latency: "< 0.5 ms",
    badge: "Stage 1 & 2",
    description: "Evaluates sovereign Indian infrastructure (.gov.in, isro.gov.in, drdo.gov.in) with a 0% False Positive guarantee in sub-0.1ms, or fetches recent verdicts from in-memory Redis cache.",
    icon: Database,
    accent: "text-emerald-700 bg-emerald-50 border-emerald-200"
  },
  {
    stage: 2,
    title: "Threat Intel (STIX/TAXII)",
    latency: "< 1.0 ms",
    badge: "Stage 3",
    description: "Queries high-speed in-memory hash sets populated from URLhaus, AlienVault OTX, and STIX feeds. Instant 100-point contribution on known active C2 / malware indicators.",
    icon: ShieldAlert,
    accent: "text-rose-700 bg-rose-50 border-rose-200"
  },
  {
    stage: 3,
    title: "Local Deterministic Rules",
    latency: "< 0.3 ms",
    badge: "Stage 4",
    description: "Evaluates RFC 1035 compliance, excessive subdomain depth, dangerous TLD scoring, and punycode/IDN homoglyph normalization without external network calls.",
    icon: FileCheck2,
    accent: "text-blue-700 bg-blue-50 border-blue-200"
  },
  {
    stage: 4,
    title: "ML Lexical Engine (Random Forest + TreeSHAP)",
    latency: "~30 ms",
    badge: "Stage 5",
    description: "Extracts 19 mathematical features (Shannon entropy, digit/vowel ratios, consonant clustering, brand Levenshtein distances) and evaluates a 150-tree Random Forest explained via TreeSHAP.",
    icon: BrainCircuit,
    accent: "text-purple-700 bg-purple-50 border-purple-200"
  },
  {
    stage: 5,
    title: "Behavioral Sliding Window Tracker",
    latency: "~1.5 ms",
    badge: "Stage 6",
    description: "Correlates individual endpoint query frequency in a 60-second sliding window to detect DGA NXDOMAIN spray attacks, fast-flux DNS, and high-frequency tunneling bursts.",
    icon: Activity,
    accent: "text-amber-700 bg-amber-50 border-amber-200"
  },
  {
    stage: 6,
    title: "Geo-Intel & Active Response",
    latency: "< 1.0 ms",
    badge: "Stage 7",
    description: "Enriches destination IPs with local GeoLite2 ASN jurisdiction. When device risk >= 80, automatically triggers zero-trust VLAN quarantine and DNS sinkholing (0.0.0.0).",
    icon: ZapOff,
    accent: "text-slate-700 bg-slate-100 border-slate-300"
  }
];

export function HowItWorks() {
  const [activeInteractiveTab, setActiveInteractiveTab] = useState<"waterfall" | "microscope" | "comparison" | "geo">("waterfall");

  return (
    <section className="border-b border-slate-200 bg-slate-50/60 py-16 md:py-24">
      <div className="mx-auto max-w-[1160px] px-6">
        
        {/* Section Header */}
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3 shadow-2xs">
            Architecture &amp; Defense-in-Depth
          </div>
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
            Seven Synchronous Stages. <span className="text-emerald-600">Zero Black-Box Guesswork.</span>
          </h2>
          <p className="mt-3 text-base text-slate-600 font-sans leading-relaxed">
            Unlike opaque commercial DNS filtering services, DNS Shield is engineered around a transparent, 
            cheap-to-expensive evaluation chain that outputs full mathematical audit traces for every lookup.
          </p>
        </div>

        {/* 6 Grid Architecture Cards */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PIPELINE_PILLARS.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div
                key={pillar.title}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs hover:border-slate-300 transition-all"
              >
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg border", pillar.accent)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-600 border border-slate-200">
                      {pillar.badge}
                    </span>
                    <span className="font-mono text-[11px] font-semibold text-emerald-700">
                      {pillar.latency}
                    </span>
                  </div>
                </div>

                <h3 className="font-display text-base font-bold text-slate-900 mt-3">
                  {pillar.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-600 font-sans">
                  {pillar.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Interactive Lab Tabs */}
        <div className="mt-16 pt-12 border-t border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-400">Interactive Forensic Lab</span>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">Explore Detection Primitives Live</h3>
            </div>

            {/* Tab Buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveInteractiveTab("waterfall")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 font-mono text-xs font-bold transition-all cursor-pointer border",
                  activeInteractiveTab === "waterfall"
                    ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                )}
              >
                <BarChart3 className="h-3.5 w-3.5" /> Risk Waterfall (#5)
              </button>

              <button
                type="button"
                onClick={() => setActiveInteractiveTab("microscope")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 font-mono text-xs font-bold transition-all cursor-pointer border",
                  activeInteractiveTab === "microscope"
                    ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                )}
              >
                <Microscope className="h-3.5 w-3.5" /> String Microscope (#6)
              </button>

              <button
                type="button"
                onClick={() => setActiveInteractiveTab("comparison")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 font-mono text-xs font-bold transition-all cursor-pointer border",
                  activeInteractiveTab === "comparison"
                    ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                )}
              >
                <SplitSquareVertical className="h-3.5 w-3.5" /> Dual-Lane Trace (#11)
              </button>

              <button
                type="button"
                onClick={() => setActiveInteractiveTab("geo")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 font-mono text-xs font-bold transition-all cursor-pointer border",
                  activeInteractiveTab === "geo"
                    ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                )}
              >
                <Compass className="h-3.5 w-3.5" /> Geo / ASN Context (#12)
              </button>
            </div>
          </div>

          {/* Active Lab Component */}
          {activeInteractiveTab === "waterfall" && <RiskWaterfall />}
          {activeInteractiveTab === "microscope" && <DomainMicroscope />}
          {activeInteractiveTab === "comparison" && <VerdictComparison />}
          {activeInteractiveTab === "geo" && <GeoContextStrip />}
        </div>

      </div>
    </section>
  );
}
