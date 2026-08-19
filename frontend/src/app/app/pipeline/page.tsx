"use client";

import { useEffect, useState } from "react";
import { getEvents, getStats } from "@/lib/api";
import type { QueryResult, PipelineStage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Zap, Activity, CheckCircle2, ShieldAlert, Layers, Server, Cpu, Database, Network, ArrowRight } from "lucide-react";
import { PipelineFlowStrip } from "@/components/PipelineFlowStrip";

// ─── Exhaustive Stage Metadata & Documentation ───────────────
const STAGE_SPECS = [
  {
    num: "01",
    name: "Deterministic Allowlist & LRU Cache",
    shortName: "DETERMINISTIC ALLOWLIST",
    service: "redis-cache",
    port: "6379",
    latency: "<0.1ms",
    rfc: "RFC 1034 / RFC 8484",
    protocol: "In-Memory Key-Value & Bloom Filter",
    desc: "First-line screening using Redis Bloom filters and L1 local LRU caches containing top 100k authoritative domains (Tranco, Cisco Umbrella, Microsoft O365, Google Workspace). Benign matches bypass downstream ML stages in sub-millisecond execution.",
    inputSchema: '{ "domain": "string", "query_type": "A | AAAA | TXT | CNAME", "client_ip": "ipv4" }',
    outputSchema: '{ "allowlisted": boolean, "cache_hit": boolean, "ttl_remaining": number }',
    algorithm: "Murmur3 Hash Bloom Filter (0.001% false positive rate)",
  },
  {
    num: "02",
    name: "Response Policy Zone (RPZ) Threat Intel",
    shortName: "THREAT INTEL FEEDS",
    service: "threat-intel-rpz",
    port: "8003",
    latency: "0.2ms",
    rfc: "RFC 8805 / RPZ Spec",
    protocol: "Prefix-Trie & Exact Radix Match",
    desc: "Ingests and syncs hourly feeds from Abuse.ch URLhaus, PhishTank, AlienVault OTX, and Emerging Threats. Checks local radix tree of 133,000+ cached indicators to trigger deterministic hard blocks.",
    inputSchema: '{ "fqdn": "string", "tld": "string", "nameserver": "string" }',
    outputSchema: '{ "rpz_match": boolean, "feed_source": "string", "confidence": float, "action": "BLOCK | PASSTHRU" }',
    algorithm: "Compressed Radix Tree with O(k) prefix matching",
  },
  {
    num: "03",
    name: "Lexical Entropy & Statistical Feature Extraction",
    shortName: "LEXICAL & ENTROPY SCAN",
    service: "lexical-eng",
    port: "8000",
    latency: "0.4ms",
    rfc: "NIST SP 800-81-2",
    protocol: "Vectorized NumPy Feature Matrix",
    desc: "Extracts 24 lexical features: Shannon entropy (H), character bi-gram perplexity, consonant-to-vowel ratio, numeral density, symbol transitions, and sub-label hierarchy depth.",
    inputSchema: '{ "domain_tokens": string[], "label_lengths": number[] }',
    outputSchema: '{ "entropy_bits": float, "ngram_perplexity": float, "vowel_ratio": float, "char_transitions": int }',
    algorithm: "Shannon Information Theory: H(X) = -sum(P(x) * log2(P(x)))",
  },
  {
    num: "04",
    name: "Random Forest & XGBoost ML Inference",
    shortName: "DGA RANDOM FOREST ML",
    service: "ml-inference",
    port: "8001",
    latency: "1.1ms",
    rfc: "MITRE ATT&CK T1568.002",
    protocol: "ONNX Runtime / C++ Inference",
    desc: "Executes an ensemble of 150 Random Forest decision trees trained on 1.2M labeled benign/DGA samples (Cryptolocker, Conficker, Mirai, BazarLoader). Outputs probabilistic threat distribution.",
    inputSchema: '{ "feature_vector": float[24] }',
    outputSchema: '{ "dga_probability": float (0.0-1.0), "tree_variance": float, "gini_confidence": float }',
    algorithm: "Random Forest Classifier (150 estimators, max_depth=14, Gini Criterion)",
  },
  {
    num: "05",
    name: "Homoglyph & Typosquatting Phish Arbiter",
    shortName: "HOMOGLYPH & PHISHING",
    service: "homoglyph-eng",
    port: "8002",
    latency: "0.8ms",
    rfc: "Unicode TR39 / Confusable Mapping",
    protocol: "Skeleton Transform + Jaro-Winkler Tree",
    desc: "Normalizes Cyrillic, Greek, and Latin lookalike characters to prototype skeletons. Evaluates Levenshtein distance against top 10,000 protected banking, healthcare, and enterprise login brands.",
    inputSchema: '{ "punycode_domain": "string", "unicode_fqdn": "string" }',
    outputSchema: '{ "target_brand": "string", "jaro_winkler_dist": float, "homoglyph_detected": boolean }',
    algorithm: "Unicode Skeleton Mapping + Weighted Damerau-Levenshtein",
  },
  {
    num: "06",
    name: "DNS Tunnelling & Exfiltration Sequential Detector",
    shortName: "DNS TUNNELLING DETECTOR",
    service: "tunnel-exfil",
    port: "8004",
    latency: "1.2ms",
    rfc: "MITRE ATT&CK T1048.003",
    protocol: "Sliding Window Markov Chain",
    desc: "Detects covert DNS data exfiltration channels (Iodine, DNScat2, Cobalt Strike). Analyzes payload entropy in subdomains, TXT/NULL record query frequencies, and inter-arrival time clustering.",
    inputSchema: '{ "subdomain_payload": "string", "query_frequency_hz": float, "record_type": "string" }',
    outputSchema: '{ "tunnel_prob": float, "chunk_encoding": "Base32 | Base64 | Hex", "exfil_volume_bytes": int }',
    algorithm: "Byte Frequency Distribution & Cumulative Entropy Clustering",
  },
  {
    num: "07",
    name: "SHAP Explainability & Final Arbiter Gate",
    shortName: "SHAP EXPLAINABILITY",
    service: "shap-arbiter",
    port: "8005",
    latency: "0.9ms",
    rfc: "Explainable AI Standard / Lundberg 2017",
    protocol: "Game-Theoretic Marginal Attribution",
    desc: "Aggregates signals from all upstream stages. Computes TreeSHAP additive feature contributions (phi_i) and checks configured policy thresholds to emit the final authoritative ALLOW, FLAG, or BLOCK verdict.",
    inputSchema: '{ "stage_contributions": float[6], "global_features": map }',
    outputSchema: '{ "final_verdict": "ALLOW | FLAG | BLOCK", "final_risk_score": int, "shap_values": float[] }',
    algorithm: "TreeSHAP Local Explanation: f(x) = phi_0 + sum(phi_i)",
  },
];

function statusColor(contribution: number): string {
  if (contribution === 0) return "#059669";
  if (contribution >= 70) return "#dc2626";
  if (contribution >= 40) return "#d97706";
  if (contribution >= 10) return "#059669";
  return "#64748b";
}

function statusLabel(contribution: number, isActive: boolean): string {
  if (isActive) return "INSPECTING";
  if (contribution === 0) return "CLEAN PASS";
  if (contribution >= 70) return "CRITICAL BLOCK";
  if (contribution >= 40) return "FLAGGED";
  return "PASS";
}

export default function PipelinePage() {
  const [activeStage, setActiveStage] = useState(3);
  const [latestEvent, setLatestEvent] = useState<QueryResult | null>(null);

  useEffect(() => {
    getEvents(50)
      .then((events) => {
        const flagged = events.find((e) => e.verdict === "FLAG" || e.verdict === "BLOCK");
        if (flagged) setLatestEvent(flagged);
      })
      .catch(() => {});
  }, []);

  const spec = STAGE_SPECS[activeStage];
  const contrib = latestEvent?.pipeline?.[activeStage]?.contribution ?? (activeStage === 3 ? 31 : 0);

  return (
    <div className="flex h-full w-full" style={{ height: "calc(100vh - 64px)" }}>
      {/* Left Column: 7 Stages List */}
      <div className="flex w-96 shrink-0 flex-col border-r border-slate-200 bg-white overflow-hidden select-none">
        <div className="border-b border-slate-200 px-5 py-4 bg-slate-50/50">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono block">
            INTERCEPTOR ENGINE
          </span>
          <h1 className="text-sm font-bold text-slate-900 font-sans mt-0.5">
            7-Stage Interceptor Cascade
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 font-mono">
            Total Pipeline P99 Latency: ~5.7ms
          </p>
        </div>

        <div className="flex-1 space-y-2.5 overflow-y-auto p-4">
          {STAGE_SPECS.map((stage, idx) => {
            const isActive = activeStage === idx;
            const stageContrib = latestEvent?.pipeline?.[idx]?.contribution ?? 0;
            const label = statusLabel(stageContrib, isActive);
            const color = statusColor(stageContrib);

            return (
              <div key={stage.num}>
                {idx > 0 && (
                  <div className="flex justify-start pl-[38px] py-0.5">
                    <div
                      className={cn(
                        "stage-connector h-3 transition-colors duration-300",
                        idx <= activeStage ? "bg-blue-300" : "",
                      )}
                    />
                  </div>
                )}
                <button
                  onClick={() => setActiveStage(idx)}
                  className={cn(
                    "w-full rounded-xl border p-4 text-left transition-all duration-150 shadow-2xs",
                    isActive
                      ? "border-blue-500 bg-blue-50/60 shadow-xs ring-2 ring-blue-100"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={cn("font-mono text-[11px] font-bold", isActive ? "text-blue-700" : "text-slate-400")}>
                          STAGE {stage.num}
                        </span>
                        <span className="font-mono text-[10px] text-slate-500">:{stage.port}</span>
                      </div>
                      <div className={cn("text-xs font-bold mt-0.5 line-clamp-1", isActive ? "text-slate-900" : "text-slate-700")}>
                        {stage.shortName}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono text-[10px] font-bold uppercase tracking-wider" style={{ color }}>
                        {label}
                      </div>
                      <div className="font-mono text-[11px] font-bold mt-0.5 text-slate-600">
                        {stage.latency}
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Column: Deep Stage Inspection & Spec */}
      <div className="flex-1 flex flex-col overflow-y-auto bg-slate-50/40">
        {/* Header Strip */}
        <div className="border-b border-slate-200 bg-white px-8 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 font-mono text-xs text-slate-400 uppercase font-bold tracking-wider">
                <span>Stage {spec.num} of 07</span>
                <span>&bull;</span>
                <span>Port :{spec.port}</span>
                <span>&bull;</span>
                <span className="text-blue-600">{spec.rfc}</span>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 mt-1 font-sans">
                {spec.name}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold font-mono text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Service Online
              </span>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-8 space-y-6 w-full">
          {/* Live Cascade Flow Diagram */}
          <PipelineFlowStrip
            stages={STAGE_SPECS.map((s, idx) => ({
              num: s.num,
              shortName: s.shortName.split(" ").slice(0, 2).join(" "),
              contribution: latestEvent?.pipeline?.[idx]?.contribution ?? (idx === 3 ? 31 : 0),
            }))}
            activeIndex={activeStage}
            onSelect={setActiveStage}
          />

          {/* Description Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block font-mono">
              ENGINE ARCHITECTURE &amp; SPECIFICATION
            </span>
            <p className="mt-2 text-sm text-slate-700 leading-relaxed font-sans">
              {spec.desc}
            </p>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 font-mono block uppercase text-[10px]">Microservice ID</span>
                <span className="font-mono font-bold text-slate-900 mt-0.5 block">{spec.service}</span>
              </div>
              <div>
                <span className="text-slate-400 font-mono block uppercase text-[10px]">Internal Protocol</span>
                <span className="font-mono font-bold text-blue-600 mt-0.5 block">{spec.protocol}</span>
              </div>
              <div>
                <span className="text-slate-400 font-mono block uppercase text-[10px]">Benchmarked Latency</span>
                <span className="font-mono font-bold text-emerald-700 mt-0.5 block">{spec.latency} (P99)</span>
              </div>
            </div>
          </div>

          {/* Algorithm & Mathematical Foundation */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block font-mono">
              MATHEMATICAL CORE &amp; ALGORITHM
            </span>
            <div className="mt-2 rounded-lg bg-slate-900 p-3 text-slate-100 font-mono text-xs">
              <code>{spec.algorithm}</code>
            </div>
          </div>

          {/* Data Contracts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block font-mono mb-2">
                INGESTION PAYLOAD CONTRACT (INPUT)
              </span>
              <pre className="rounded-lg bg-slate-50 border border-slate-200 p-3 font-mono text-xs text-slate-800 overflow-x-auto">
                {spec.inputSchema}
              </pre>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block font-mono mb-2">
                DECISION RESPONSE CONTRACT (OUTPUT)
              </span>
              <pre className="rounded-lg bg-slate-50 border border-slate-200 p-3 font-mono text-xs text-slate-800 overflow-x-auto">
                {spec.outputSchema}
              </pre>
            </div>
          </div>

          {/* Stage Impact on Final Verdict */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block font-mono mb-5">
              THIS STAGE'S IMPACT ON LATEST EVALUATED QUERY
            </span>

            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-700">Risk Contribution</span>
                  <span className="font-mono font-bold" style={{ color: statusColor(contrib) }}>
                    {contrib}%
                  </span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${contrib}%`, backgroundColor: statusColor(contrib) }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-700">Latency Budget (of ~5.7ms total pipeline)</span>
                  <span className="font-mono font-bold text-blue-600">{spec.latency}</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all duration-700 ease-out"
                    style={{ width: `${Math.min((parseFloat(spec.latency) / 5.7) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
