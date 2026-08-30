"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, ShieldAlert, ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComparisonLane {
  title: string;
  domain: string;
  verdict: "ALLOW" | "BLOCK";
  latency: string;
  finalScore: number;
  stages: {
    name: string;
    status: "pass" | "hit" | "bypass";
    delta: number;
    reason: string;
  }[];
}

const COMPARISON_DATA: { allow: ComparisonLane; block: ComparisonLane } = {
  allow: {
    title: "Sovereign / Benign Request",
    domain: "isro.gov.in",
    verdict: "ALLOW",
    latency: "0.08 ms",
    finalScore: 0,
    stages: [
      { name: "Allowlist", status: "bypass", delta: 0, reason: "Instant .gov.in sovereign allowlist match" },
      { name: "Redis Cache", status: "pass", delta: 0, reason: "Cached allowlist entry verified" },
      { name: "Threat Intel", status: "pass", delta: 0, reason: "Zero malicious indicators matched" },
      { name: "ML Lexical", status: "pass", delta: 0, reason: "Known dictionary term, low entropy (2.81)" },
      { name: "Behavioral", status: "pass", delta: 0, reason: "Baseline client query volume (1.2 QPS)" },
      { name: "Geo-Intel", status: "pass", delta: 0, reason: "Resolved to Indian National Data Centre (AS55824)" },
      { name: "Active Response", status: "pass", delta: 0, reason: "Traffic routed cleanly to authoritative resolver" },
    ]
  },
  block: {
    title: "Malicious DGA / Botnet Request",
    domain: "xq9m2kz7v4naplq.top",
    verdict: "BLOCK",
    latency: "34.2 ms",
    finalScore: 100,
    stages: [
      { name: "Allowlist", status: "pass", delta: 0, reason: "Not in emergency allowlist" },
      { name: "Redis Cache", status: "pass", delta: 0, reason: "Cache miss; forwarded to cold evaluation" },
      { name: "Threat Intel", status: "pass", delta: 0, reason: "Zero-day payload (unlisted on public feeds)" },
      { name: "ML Lexical", status: "hit", delta: 75, reason: "High entropy (4.21) + 8-consonant cluster (RF-150)" },
      { name: "Behavioral", status: "hit", delta: 25, reason: "Host NXDOMAIN query burst (32 queries / 60s)" },
      { name: "Geo-Intel", status: "pass", delta: 0, reason: "Anomalous bulletproof hosting ASN tagged" },
      { name: "Active Response", status: "hit", delta: 0, reason: "Host VLAN quarantined & sinkholed to 0.0.0.0" },
    ]
  }
};

export function VerdictComparison({ className }: { className?: string }) {
  const [activeLane, setActiveLane] = useState<"both" | "allow" | "block">("both");

  return (
    <div className={cn("rounded-2xl border border-slate-200 bg-white p-6 shadow-sm", className)}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-slate-400">Side-by-Side Evaluation</span>
            <span className="rounded-full bg-slate-100 text-slate-700 px-2 py-0.5 font-mono text-[10px] font-bold border border-slate-200">Dual Lane Trace</span>
          </div>
          <h3 className="text-lg font-bold text-slate-900 mt-1">ALLOW vs BLOCK: The Divergence Point</h3>
          <p className="text-xs text-slate-500 mt-0.5">Compare how benign infrastructure bypasses latency vs where malicious traffic triggers active isolation.</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ALLOW LANE */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-5">
          <div className="flex items-center justify-between pb-3 border-b border-emerald-200/60">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div>
                <span className="font-mono text-[10px] uppercase text-emerald-700 font-bold block">{COMPARISON_DATA.allow.title}</span>
                <span className="font-mono text-sm font-bold text-slate-900">{COMPARISON_DATA.allow.domain}</span>
              </div>
            </div>

            <div className="text-right">
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2.5 py-0.5 font-mono text-xs font-bold text-emerald-800 border border-emerald-300">
                ALLOW ({COMPARISON_DATA.allow.latency})
              </span>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {COMPARISON_DATA.allow.stages.map((st, i) => (
              <div key={i} className="flex items-center justify-between gap-2 rounded-lg bg-white p-2.5 border border-emerald-100 font-mono text-xs shadow-2xs">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="font-semibold text-slate-800">{st.name}</span>
                </div>
                <div className="text-slate-500 text-[11px] font-sans truncate max-w-[200px] text-right">
                  {st.reason}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-emerald-200/60 flex items-center justify-between font-mono text-xs text-emerald-900">
            <span>Cumulative Score: <strong>0 / 100</strong></span>
            <span className="font-bold text-emerald-700">0% False Positive Guarantee</span>
          </div>
        </div>

        {/* BLOCK LANE */}
        <div className="rounded-xl border border-rose-200 bg-rose-50/30 p-5">
          <div className="flex items-center justify-between pb-3 border-b border-rose-200/60">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-rose-100 text-rose-700">
                <XCircle className="h-4 w-4" />
              </div>
              <div>
                <span className="font-mono text-[10px] uppercase text-rose-700 font-bold block">{COMPARISON_DATA.block.title}</span>
                <span className="font-mono text-sm font-bold text-slate-900">{COMPARISON_DATA.block.domain}</span>
              </div>
            </div>

            <div className="text-right">
              <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-2.5 py-0.5 font-mono text-xs font-bold text-rose-800 border border-rose-300">
                BLOCK ({COMPARISON_DATA.block.latency})
              </span>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {COMPARISON_DATA.block.stages.map((st, i) => (
              <div key={i} className={cn(
                "flex items-center justify-between gap-2 rounded-lg p-2.5 font-mono text-xs border shadow-2xs",
                st.status === "hit" ? "bg-rose-50 border-rose-200 text-rose-900" : "bg-white border-slate-200 text-slate-800"
              )}>
                <div className="flex items-center gap-2">
                  <span className={cn("h-2 w-2 rounded-full", st.status === "hit" ? "bg-rose-500" : "bg-slate-300")} />
                  <span className="font-semibold">{st.name}</span>
                  {st.delta > 0 && (
                    <span className="rounded bg-rose-600 px-1 py-0.2 font-mono text-[10px] font-bold text-white">
                      +{st.delta}
                    </span>
                  )}
                </div>
                <div className="text-slate-600 text-[11px] font-sans truncate max-w-[200px] text-right">
                  {st.reason}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-rose-200/60 flex items-center justify-between font-mono text-xs text-rose-900">
            <span>Cumulative Score: <strong className="text-rose-600">100 / 100</strong></span>
            <span className="font-bold text-rose-700">Automated Quarantine Engaged</span>
          </div>
        </div>
      </div>
    </div>
  );
}
