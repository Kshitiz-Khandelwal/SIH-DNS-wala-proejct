"use client";

import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Microscope, AlertCircle, CheckCircle2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

// Mathematical Shannon entropy calculation
function calculateEntropy(str: string): number {
  if (!str) return 0;
  const map: Record<string, number> = {};
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    map[c] = (map[c] || 0) + 1;
  }
  let ent = 0;
  for (const c in map) {
    const p = map[c] / str.length;
    ent -= p * Math.log2(p);
  }
  return Number(ent.toFixed(2));
}

// Longest consonant sequence finder
function getLongestConsonantRun(str: string): number {
  const consonants = "bcdfghjklmnpqrstvwxyz";
  let maxRun = 0;
  let currentRun = 0;
  for (const char of str.toLowerCase()) {
    if (consonants.includes(char)) {
      currentRun++;
      if (currentRun > maxRun) maxRun = currentRun;
    } else {
      currentRun = 0;
    }
  }
  return maxRun;
}

const HIGH_RISK_TLDS = [".top", ".xyz", ".cc", ".tk", ".pw", ".bid", ".club", ".shop", ".ru", ".su"];
const SOVEREIGN_TLDS = [".gov.in", ".nic.in", ".isro.gov.in", ".drdo.gov.in", ".mil.in", ".ac.in", ".edu.in"];

const KNOWN_BRANDS = [
  "isro.gov.in", "drdo.gov.in", "sbi.co.in", "rbi.org.in", "uidai.gov.in",
  "microsoft.com", "google.com", "apple.com", "amazon.com", "paypal.com"
];

export function DomainMicroscope({ className }: { className?: string }) {
  const [inputDomain, setInputDomain] = useState<string>("rnicrosoft-login.top");

  const cleanString = inputDomain.trim().toLowerCase();

  const analysis = useMemo(() => {
    const parts = cleanString.split(".");
    const sld = parts[0] || "";
    const tld = parts.length > 1 ? "." + parts.slice(1).join(".") : "";

    const entropy = calculateEntropy(sld);
    const consonantRun = getLongestConsonantRun(sld);
    
    // Homoglyphs check
    const homoglyphs: string[] = [];
    if (cleanString.includes("rn")) homoglyphs.push("'rn' substituted for 'm'");
    if (cleanString.includes("0") && /[a-z]/.test(cleanString)) homoglyphs.push("'0' substituted for 'o'");
    if (cleanString.includes("1") && /[a-z]/.test(cleanString)) homoglyphs.push("'1' substituted for 'l' or 'i'");
    if (cleanString.includes("vv")) homoglyphs.push("'vv' substituted for 'w'");

    const isHighRiskTld = HIGH_RISK_TLDS.some(t => cleanString.endsWith(t));
    const isSovereignTld = SOVEREIGN_TLDS.some(t => cleanString.endsWith(t));

    // Consonant / Vowel count
    const vowels = (sld.match(/[aeiou]/g) || []).length;
    const consonants = (sld.match(/[bcdfghjklmnpqrstvwxyz]/g) || []).length;
    const digits = (sld.match(/[0-9]/g) || []).length;
    const vowelRatio = sld.length > 0 ? Number((vowels / sld.length).toFixed(2)) : 0;
    const digitRatio = sld.length > 0 ? Number((digits / sld.length).toFixed(2)) : 0;

    // DGA / Phishing Indicators
    const indicators: { label: string; risk: "high" | "med" | "safe"; detail: string }[] = [];

    if (entropy >= 3.8) {
      indicators.push({ label: "High Entropy", risk: "high", detail: `${entropy} bits/symbol (> 3.8 threshold indicates algorithmic randomness)` });
    } else if (entropy >= 3.2) {
      indicators.push({ label: "Moderate Entropy", risk: "med", detail: `${entropy} bits/symbol (normal domain range)` });
    } else {
      indicators.push({ label: "Low Entropy", risk: "safe", detail: `${entropy} bits/symbol (structured natural language)` });
    }

    if (consonantRun >= 6) {
      indicators.push({ label: "Consonant Clustering", risk: "high", detail: `${consonantRun} consecutive consonants (rare in human vocabulary)` });
    }

    if (homoglyphs.length > 0) {
      indicators.push({ label: "Homoglyph Confusion", risk: "high", detail: homoglyphs.join(", ") });
    }

    if (isHighRiskTld) {
      indicators.push({ label: "High-Risk TLD", risk: "high", detail: `${tld} has elevated historical abuse score` });
    } else if (isSovereignTld) {
      indicators.push({ label: "Sovereign Protected Root", risk: "safe", detail: `${tld} registered under Indian sovereign registry (0% FPR)` });
    }

    return {
      entropy,
      consonantRun,
      vowelRatio,
      digitRatio,
      vowels,
      consonants,
      digits,
      homoglyphs,
      isHighRiskTld,
      isSovereignTld,
      indicators,
    };
  }, [cleanString]);

  return (
    <div className={cn("rounded-2xl border border-slate-200 bg-white p-6 shadow-sm", className)}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <Microscope className="h-4 w-4 text-emerald-600" />
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-slate-400">Lexical Feature Extractor</span>
            <span className="rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 font-mono text-[10px] font-bold border border-emerald-200">19 Features</span>
          </div>
          <h3 className="text-lg font-bold text-slate-900 mt-1">Real-Time Domain String Inspection</h3>
          <p className="text-xs text-slate-500 mt-0.5">Explore how the Random Forest classifier inspects entropy, n-grams, and homoglyphs.</p>
        </div>

        {/* Quick Example Pills */}
        <div className="flex flex-wrap gap-1.5">
          {[
            { label: "Typosquat", domain: "rnicrosoft-login.top" },
            { label: "DGA Malware", domain: "xq9m2kz7v4naplq.cc" },
            { label: "Sovereign Asset", domain: "isro.gov.in" },
            { label: "Subdomain Exfil", domain: "YWJjZDEy.attacker-c2.net" },
          ].map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => setInputDomain(preset.domain)}
              className={cn(
                "rounded-lg px-2.5 py-1 font-mono text-xs transition-colors cursor-pointer border",
                cleanString === preset.domain.toLowerCase()
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input Box */}
      <div className="my-6">
        <label htmlFor="microscope-domain-input" className="font-mono text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
          Test Domain String
        </label>
        <div className="relative">
          <input
            id="microscope-domain-input"
            type="text"
            value={inputDomain}
            onChange={(e) => setInputDomain(e.target.value)}
            placeholder="Type any domain (e.g. rnicrosoft.com)..."
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-mono text-base font-bold text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
      </div>

      {/* Annotated Domain View */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 mb-6">
        <span className="font-mono text-[10px] uppercase text-slate-400 block mb-1">Character Anatomy</span>
        <div className="flex flex-wrap gap-1 font-mono text-lg">
          {cleanString.split("").map((ch, i) => {
            const isDigit = /[0-9]/.test(ch);
            const isVowel = /[aeiou]/.test(ch);
            const isDot = ch === ".";

            return (
              <span
                key={i}
                className={cn(
                  "inline-flex h-8 w-7 items-center justify-center rounded-md border text-xs font-bold transition-transform hover:scale-110",
                  isDot ? "bg-slate-200 border-slate-300 text-slate-600" :
                  isDigit ? "bg-amber-100 border-amber-300 text-amber-800" :
                  isVowel ? "bg-emerald-100 border-emerald-300 text-emerald-800" :
                  "bg-white border-slate-200 text-slate-800"
                )}
                title={`Char: '${ch}' | ${isDigit ? 'Digit' : isVowel ? 'Vowel' : 'Consonant'}`}
              >
                {ch}
              </span>
            );
          })}
        </div>
        <div className="flex gap-4 mt-2 font-mono text-[10px] text-slate-500">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Vowels ({analysis.vowels})</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-300" /> Consonants ({analysis.consonants})</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" /> Digits ({analysis.digits})</span>
        </div>
      </div>

      {/* Key Metric Gauges */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
          <span className="font-mono text-[10px] uppercase text-slate-400 block">Shannon Entropy</span>
          <div className="flex items-baseline gap-1 mt-1 font-mono">
            <span className={cn("text-xl font-bold", analysis.entropy >= 3.8 ? "text-rose-600" : "text-emerald-600")}>
              {analysis.entropy}
            </span>
            <span className="text-xs text-slate-400">bits</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-1">Threshold: 3.80 bits</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
          <span className="font-mono text-[10px] uppercase text-slate-400 block">Consonant Run</span>
          <div className="flex items-baseline gap-1 mt-1 font-mono">
            <span className={cn("text-xl font-bold", analysis.consonantRun >= 6 ? "text-rose-600" : "text-emerald-600")}>
              {analysis.consonantRun}
            </span>
            <span className="text-xs text-slate-400">chars</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-1">Max cluster sequence</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
          <span className="font-mono text-[10px] uppercase text-slate-400 block">Vowel Ratio</span>
          <div className="flex items-baseline gap-1 mt-1 font-mono">
            <span className="text-xl font-bold text-slate-900">{analysis.vowelRatio}</span>
            <span className="text-xs text-slate-400">/ 1.0</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-1">Natural text: 0.35–0.45</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
          <span className="font-mono text-[10px] uppercase text-slate-400 block">Digit Ratio</span>
          <div className="flex items-baseline gap-1 mt-1 font-mono">
            <span className={cn("text-xl font-bold", analysis.digitRatio > 0.2 ? "text-amber-600" : "text-slate-900")}>
              {analysis.digitRatio}
            </span>
            <span className="text-xs text-slate-400">/ 1.0</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-1">Subdomain digit ratio</span>
        </div>
      </div>

      {/* Feature Indicators */}
      <div className="space-y-2">
        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Extracted Signal Analysis</span>
        {analysis.indicators.map((ind, i) => (
          <div
            key={i}
            className={cn(
              "flex items-start gap-2.5 rounded-lg border p-2.5 font-mono text-xs",
              ind.risk === "high" ? "border-rose-200 bg-rose-50/70 text-rose-800" :
              ind.risk === "med" ? "border-amber-200 bg-amber-50/70 text-amber-800" :
              "border-emerald-200 bg-emerald-50/70 text-emerald-800"
            )}
          >
            {ind.risk === "high" ? <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" /> :
             ind.risk === "med" ? <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" /> :
             <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />}
            <div>
              <strong className="font-bold">{ind.label}: </strong>
              <span className="text-slate-700 font-sans">{ind.detail}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
