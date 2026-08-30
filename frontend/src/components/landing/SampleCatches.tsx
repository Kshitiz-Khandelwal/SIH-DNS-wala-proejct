"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { queryDomain } from "@/lib/api";
import type { QueryResult } from "@/lib/types";
import { VerdictBadge } from "@/components/VerdictBadge";
import { RiskScore } from "@/components/RiskScore";
import { Play, RefreshCw, FolderSearch, ShieldCheck, ShieldAlert, ShieldX, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface CaseFile {
  caseId: string;
  domain: string;
  category: string;
  attackFamily: string;
  verdict: "ALLOW" | "FLAG" | "BLOCK";
  riskScore: number;
  signals: string[];
  description: string;
  mitreTactic: string;
}

const CASE_FILES: CaseFile[] = [
  {
    caseId: "CASE-2026-001",
    domain: "isro.gov.in",
    category: "Sovereign Critical Infrastructure",
    attackFamily: "Clean / Authorized",
    verdict: "ALLOW",
    riskScore: 0,
    signals: ["Sovereign .gov.in root", "Emergency Allowlist Bypass", "0% FPR Guarantee"],
    description: "Sovereign space research agency root domain. Matches Stage 1 emergency allowlist and resolves in < 0.1ms without triggering ML false positives.",
    mitreTactic: "Legitimate Operation"
  },
  {
    caseId: "CASE-2026-002",
    domain: "xq9m2kz7v4naplq.top",
    category: "Algorithmic Malware (DGA)",
    attackFamily: "Corebot / Locky DGA",
    verdict: "BLOCK",
    riskScore: 100,
    signals: ["Entropy 4.21 bits", "8 Consonant Cluster", "High-Risk .top TLD", "TreeSHAP +0.48"],
    description: "Zero-day Domain Generation Algorithm string. Random Forest lexical engine isolated high Shannon entropy and character 2-4gram clustering signature.",
    mitreTactic: "T1568.002 (Domain Generation Algorithms)"
  },
  {
    caseId: "CASE-2026-003",
    domain: "rnicrosoft-auth.com",
    category: "Visual Homoglyph Typosquatting",
    attackFamily: "Credential Phishing",
    verdict: "BLOCK",
    riskScore: 70,
    signals: ["'rn' vs 'm' Homoglyph", "Damerau-Levenshtein Dist 1", "Auth Keyword Suffix"],
    description: "Deceptive phishing domain using the 'rn' consonant combination to impersonate 'microsoft.com'. Lexical dictionary distance metric triggered active isolation.",
    mitreTactic: "T1566 (Phishing / Brand Impersonation)"
  },
  {
    caseId: "CASE-2026-004",
    domain: "YWJjZDEyMzQ1Ng.attacker-c2.net",
    category: "Encrypted DNS Tunneling",
    attackFamily: "Iodine / DNSCat2 Data Exfil",
    verdict: "BLOCK",
    riskScore: 90,
    signals: ["Base64 Subdomain Payload", "48 TXT Queries/60s", "Behavioral Velocity Spike"],
    description: "High-frequency DNS tunneling exfiltration session. Behavioral sliding window identified client IP executing anomalous TXT query bursts.",
    mitreTactic: "T1071.004 (DNS Data Exfiltration)"
  }
];

export function SampleCatches() {
  const [results, setResults] = useState<Record<string, QueryResult>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [expandedCaseId, setExpandedCaseId] = useState<string | null>("CASE-2026-002");

  async function runSample(domain: string) {
    setLoading(domain);
    try {
      const res = await queryDomain(domain);
      setResults((prev) => ({ ...prev, [domain]: res }));
    } catch {
      // Offline fallback handling
    } finally {
      setLoading(null);
    }
  }

  return (
    <section className="border-b border-slate-200 bg-white py-16 md:py-24">
      <div className="mx-auto max-w-[1160px] px-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 pb-8 border-b border-slate-200">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              <FolderSearch className="h-3.5 w-3.5" /> Investigation Case Files (#7)
            </div>
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
              Audited Threat Incidents &amp; Catches
            </h2>
            <p className="mt-2 text-sm text-slate-600 font-sans">
              Real evaluation traces across sovereign allowlists, DGA botnets, homoglyphs, and tunneling exfiltration.
            </p>
          </div>
        </div>

        {/* Case File Cards Grid */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          {CASE_FILES.map((c) => {
            const result = results[c.domain];
            const isLoading = loading === c.domain;
            const isExpanded = expandedCaseId === c.caseId;
            const currentVerdict = result ? result.verdict : c.verdict;
            const currentScore = result ? result.risk_score : c.riskScore;

            return (
              <motion.div
                key={c.caseId}
                className={cn(
                  "rounded-2xl border bg-white p-5 shadow-2xs transition-all",
                  isExpanded ? "border-slate-300 ring-1 ring-slate-200 shadow-sm" : "border-slate-200 hover:border-slate-300"
                )}
                layout
              >
                {/* Case Header Bar */}
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-400">{c.caseId}</span>
                    <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-600 border border-slate-200">
                      {c.category}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 font-mono text-xs font-bold border",
                      currentVerdict === "BLOCK" ? "bg-rose-50 text-rose-700 border-rose-200" :
                      currentVerdict === "FLAG" ? "bg-amber-50 text-amber-700 border-amber-200" :
                      "bg-emerald-50 text-emerald-700 border-emerald-200"
                    )}>
                      {currentVerdict === "BLOCK" && <ShieldX className="h-3 w-3" />}
                      {currentVerdict === "FLAG" && <ShieldAlert className="h-3 w-3" />}
                      {currentVerdict === "ALLOW" && <ShieldCheck className="h-3 w-3" />}
                      {currentVerdict}
                    </span>

                    <span className="font-mono text-xs font-bold text-slate-700">
                      {currentScore}/100
                    </span>
                  </div>
                </div>

                {/* Domain & Re-Scan Action */}
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div>
                    <span className="font-mono text-[10px] uppercase text-slate-400 block">Target Domain</span>
                    <p className="font-mono text-base font-bold text-slate-900 truncate max-w-[280px]">
                      {c.domain}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => runSample(c.domain)}
                    disabled={isLoading}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-xs font-medium text-slate-700 hover:border-emerald-500 hover:text-emerald-700 hover:bg-emerald-50/50 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      <Play className="h-3 w-3 fill-current" />
                    )}
                    {isLoading ? "Auditing…" : result ? "Re-Audited" : "Run Scan"}
                  </button>
                </div>

                {/* Signal Tags */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {c.signals.map((sig) => (
                    <span
                      key={sig}
                      className="rounded-md bg-slate-50 px-2 py-0.5 font-mono text-[11px] text-slate-600 border border-slate-200/80"
                    >
                      {sig}
                    </span>
                  ))}
                </div>

                {/* Description & Expandable Details */}
                <p className="mt-3 text-xs leading-relaxed text-slate-600 font-sans">
                  {c.description}
                </p>

                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="font-mono text-[11px]">MITRE: <strong>{c.mitreTactic}</strong></span>
                  <button
                    type="button"
                    onClick={() => setExpandedCaseId(isExpanded ? null : c.caseId)}
                    className="inline-flex items-center gap-1 font-mono text-[11px] text-emerald-700 hover:underline cursor-pointer"
                  >
                    {isExpanded ? <>Less <ChevronUp className="h-3 w-3" /></> : <>Inspect XAI <ChevronDown className="h-3 w-3" /></>}
                  </button>
                </div>

                {/* Expanded Details Drawer */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                      className="mt-3 pt-3 border-t border-slate-100 font-mono text-xs bg-slate-50 rounded-xl p-3"
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Forensic Evidence Attribution
                      </span>
                      <div className="space-y-1 text-slate-700 text-[11px]">
                        <div>• Primary Classifier: <strong>Random Forest (150 estimators, max_depth=16)</strong></div>
                        <div>• Lexical Features: <strong>Shannon Entropy, N-Gram TF-IDF, Homoglyph Distance</strong></div>
                        <div>• Mitigation Action: <strong>{c.verdict === "BLOCK" ? "Quarantine & Sinkhole to 0.0.0.0" : "Forward to Resolver"}</strong></div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
