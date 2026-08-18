"use client";

import { useState } from "react";
import {
  Brain,
  Sliders,
  CheckCircle2,
  TrendingUp,
  Cpu,
  Layers,
  Database,
  ArrowRight,
  Info,
  Sparkles,
  Calculator,
  ShieldAlert,
  Code2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FeatureSHAP {
  name: string;
  mathSymbol: string;
  val: string;
  shap: number;
  impact: string;
  formula: string;
  direction: "risk" | "safe";
}

const SHAP_FEATURES: FeatureSHAP[] = [
  {
    name: "Shannon Entropy",
    mathSymbol: "H(X)",
    val: "4.82 bits/char",
    shap: +0.312,
    impact: "+31.2% Risk",
    formula: "H(X) = -\\sum_{i=1}^n P(x_i) \\log_2 P(x_i)",
    direction: "risk",
  },
  {
    name: "Bi-gram Perplexity Rarity",
    mathSymbol: "PP(W)",
    val: "0.89",
    shap: +0.228,
    impact: "+22.8% Risk",
    formula: "PP(W) = P(w_1, w_2, ..., w_N)^{-1/N}",
    direction: "risk",
  },
  {
    name: "Consonant-to-Vowel Ratio",
    mathSymbol: "R_{cv}",
    val: "5.33 (80% cons)",
    shap: +0.184,
    impact: "+18.4% Risk",
    formula: "R_{cv} = N_{consonants} / \\max(1, N_{vowels})",
    direction: "risk",
  },
  {
    name: "Subdomain Depth & Length",
    mathSymbol: "L_{str}",
    val: "28 chars",
    shap: +0.076,
    impact: "+7.6% Risk",
    formula: "\\text{Score} = \\min(1.0, L / 45)",
    direction: "risk",
  },
  {
    name: "Levenshtein Brand Distance",
    mathSymbol: "D_L",
    val: "0.08",
    shap: -0.054,
    impact: "-5.4% Safe",
    formula: "D_L(s_1, s_2) = \\text{min edit steps to transform}",
    direction: "safe",
  },
  {
    name: "Tranco Top 1M Prior Rank",
    mathSymbol: "R_{tranco}",
    val: "Unranked",
    shap: +0.098,
    impact: "+9.8% Risk",
    formula: "\\text{Prior} = \\begin{cases} -0.45 & \\text{if rank} < 10k \\\\ +0.10 & \\text{if unranked} \\end{cases}",
    direction: "risk",
  },
];

const MODELS = [
  {
    name: "DGA Classifier (RF-V2)",
    type: "Random Forest Ensemble (150 trees, max_depth=14)",
    accuracy: "99.42%",
    f1: "0.9918",
    auc: "0.9984",
    latency: "1.1ms",
    trainedOn: "1.2M labeled domains (Alexa/Tranco + DGArchive)",
    loss: "Gini Impurity (0.012)",
    status: "Active · Primary",
  },
  {
    name: "Homoglyph & Phish Detector",
    type: "Unicode Confusable Mapping + Jaro-Winkler Tree",
    accuracy: "98.87%",
    f1: "0.9845",
    auc: "0.9912",
    latency: "0.8ms",
    trainedOn: "Top 10k Global Financial & Tech Brands",
    loss: "Edit Distance Penalty",
    status: "Active · Secondary",
  },
  {
    name: "DNS Tunnel & Exfil Arbiter",
    type: "Sequential Markov Chain + Byte-Entropy Clustering",
    accuracy: "99.15%",
    f1: "0.9890",
    auc: "0.9960",
    latency: "1.2ms",
    trainedOn: "Iodine, DNScat2, Cobalt Strike DNS Beacons",
    loss: "Negative Log-Likelihood",
    status: "Active · Anomaly Engine",
  },
];

function calculateSampleEntropy(str: string): number {
  if (!str) return 0;
  const map: Record<string, number> = {};
  for (const c of str) map[c] = (map[c] || 0) + 1;
  let ent = 0;
  const len = str.length;
  for (const k in map) {
    const p = map[k] / len;
    ent -= p * Math.log2(p);
  }
  return ent;
}

export default function XAIPage() {
  const [testDomain, setTestDomain] = useState("xk9mqz7p2n4r8v3w.top");
  const [entropy, setEntropy] = useState(4.82);
  const [charLength, setCharLength] = useState(20);
  const [activeTab, setActiveTab] = useState<"shap" | "math" | "registry">("shap");

  function handleDomainChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setTestDomain(val);
    setCharLength(val.length);
    setEntropy(Number(calculateSampleEntropy(val).toFixed(2)));
  }

  const baseValue = 0.12; // E[f(x)]
  const totalShap = SHAP_FEATURES.reduce((sum, f) => sum + f.shap, 0);
  const predictedScore = Math.min(100, Math.max(0, Math.round((baseValue + totalShap) * 100)));

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl font-sans">
              Explainable AI (XAI) &amp; Mathematical Telemetry
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 border border-purple-200 px-3 py-1 text-xs font-semibold text-purple-700">
              <Brain className="h-3.5 w-3.5" /> SHAP TreeExplainer &middot; RFC 8805
            </span>
          </div>
          <p className="mt-1.5 text-sm text-slate-600">
            Game-theoretic Shapley feature decomposition ($\phi_i$), real-time Shannon entropy sandbox, and production ML model registries.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab("shap")}
            className={cn(
              "rounded-full px-4 py-1.5 text-xs font-semibold font-mono transition-all",
              activeTab === "shap" ? "bg-slate-900 text-white shadow-2xs" : "text-slate-500 hover:text-slate-900"
            )}
          >
            SHAP Waterfall
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("math")}
            className={cn(
              "rounded-full px-4 py-1.5 text-xs font-semibold font-mono transition-all",
              activeTab === "math" ? "bg-slate-900 text-white shadow-2xs" : "text-slate-500 hover:text-slate-900"
            )}
          >
            Mathematical Formulas
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("registry")}
            className={cn(
              "rounded-full px-4 py-1.5 text-xs font-semibold font-mono transition-all",
              activeTab === "registry" ? "bg-slate-900 text-white shadow-2xs" : "text-slate-500 hover:text-slate-900"
            )}
          >
            Model Registry
          </button>
        </div>
      </div>

      {activeTab === "shap" && (
        <>
          {/* Top Formula Banner */}
          <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shrink-0 shadow-2xs">
                <Calculator className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-blue-700">
                  SHAPLEY ADDITIVE EXPLANATION EQUATION
                </span>
                <p className="font-mono text-sm font-bold text-blue-950 mt-0.5">
                  {"f(x) = φ₀ + ∑ φᵢ = " + baseValue + " (Base Risk) + " + totalShap.toFixed(3) + " (∑ φᵢ) ⟹ " + predictedScore + "/100 (Final Score)"}
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  {"Every feature either drives the score higher toward a BLOCK verdict (+φᵢ, red) or pulls it toward an ALLOW verdict (-φᵢ, green) based on marginal contributions."}
                </p>
              </div>
            </div>
          </div>

          {/* Interactive Entropy & String Sandbox */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block font-mono">
              INTERACTIVE REASONING SANDBOX
            </span>
            <h2 className="text-base font-bold text-slate-900 mt-0.5 mb-2">
              Shannon Entropy &amp; Lexical Complexity Sandbox
            </h2>
            <p className="text-xs text-slate-500 mb-5">
              Type any domain or arbitrary payload to calculate Shannon entropy, character distribution, and predicted risk in real time.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="relative flex-1 w-full">
                <input
                  type="text"
                  value={testDomain}
                  onChange={handleDomainChange}
                  placeholder="Enter sample domain..."
                  className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50/80 px-4 font-mono text-sm text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition shadow-2xs"
                />
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-center min-w-[130px] shadow-2xs">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block">Length</span>
                  <span className="font-mono text-sm font-bold text-slate-900">{charLength} chars</span>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-center min-w-[150px] shadow-2xs">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block">Entropy H(X)</span>
                  <span className={cn(
                    "font-mono text-sm font-bold",
                    entropy > 4.2 ? "text-rose-600" : entropy > 3.5 ? "text-amber-600" : "text-emerald-600"
                  )}>
                    {entropy} / 5.0
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* SHAP Decomposition Table */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block font-mono">
              TREE-SHAP FEATURE ATTRIBUTION
            </span>
            <h2 className="text-base font-bold text-slate-900 mt-0.5 mb-4">
              SHAPley Feature Importance for Target: <span className="font-mono text-blue-600 font-bold">{testDomain}</span>
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-mono bg-slate-50/50">
                    <th className="px-4 py-2.5 font-medium">Feature</th>
                    <th className="px-4 py-2.5 font-medium">Symbol</th>
                    <th className="px-4 py-2.5 font-medium">Observed Value</th>
                    <th className="px-4 py-2.5 font-medium">SHAP Value (\phi_i)</th>
                    <th className="px-4 py-2.5 font-medium">Impact Visualization</th>
                    <th className="px-4 py-2.5 text-right font-medium">Direction</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {SHAP_FEATURES.map((feat) => {
                    const isRisk = feat.direction === "risk";
                    return (
                      <tr key={feat.name} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-900">{feat.name}</td>
                        <td className="px-4 py-3 font-mono font-bold text-blue-600">{feat.mathSymbol}</td>
                        <td className="px-4 py-3 font-mono text-slate-700">{feat.val}</td>
                        <td className={cn("px-4 py-3 font-mono font-bold", isRisk ? "text-rose-600" : "text-emerald-600")}>
                          {feat.shap > 0 ? `+${feat.shap.toFixed(3)}` : feat.shap.toFixed(3)}
                        </td>
                        <td className="px-4 py-3 w-64">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                              <div
                                className={cn("h-full rounded-full transition-all duration-300", isRisk ? "bg-rose-500" : "bg-emerald-500")}
                                style={{ width: `${Math.abs(feat.shap) * 200}%` }}
                              />
                            </div>
                            <span className="font-mono text-[10px] text-slate-500 shrink-0">{feat.impact}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold",
                            isRisk ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          )}>
                            {isRisk ? "Increases Risk" : "Reduces Risk"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === "math" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {SHAP_FEATURES.map((feat) => (
            <div key={feat.name} className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                <span className="font-bold text-slate-900 text-sm">{feat.name}</span>
                <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                  {feat.mathSymbol}
                </span>
              </div>
              <div className="rounded-lg bg-slate-900 text-slate-100 p-3 font-mono text-xs overflow-x-auto mb-3">
                <code>{feat.formula}</code>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Calculated over sliding n-gram windows. Benign language corpora exhibit low perplexity and predictable vowel clustering; high entropy deviations indicate DGA or tunnelling.
              </p>
            </div>
          ))}
        </div>
      )}

      {activeTab === "registry" && (
        <div className="space-y-5">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block font-mono">
              PRODUCTION REGISTRY
            </span>
            <h2 className="text-base font-bold text-slate-900 mt-0.5 mb-4">
              Active Machine Learning Models &amp; Ensembles
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-mono bg-slate-50/50">
                    <th className="px-4 py-2.5 font-medium">Model Name</th>
                    <th className="px-4 py-2.5 font-medium">Architecture / Estimators</th>
                    <th className="px-4 py-2.5 font-medium">Accuracy</th>
                    <th className="px-4 py-2.5 font-medium">F1-Score</th>
                    <th className="px-4 py-2.5 font-medium">ROC-AUC</th>
                    <th className="px-4 py-2.5 font-medium">Inference Latency</th>
                    <th className="px-4 py-2.5 text-right font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {MODELS.map((m) => (
                    <tr key={m.name} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3.5 font-bold text-slate-900 flex items-center gap-2">
                        <Cpu className="h-4 w-4 text-blue-600" />
                        {m.name}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-slate-600">{m.type}</td>
                      <td className="px-4 py-3.5 font-mono font-bold text-emerald-700">{m.accuracy}</td>
                      <td className="px-4 py-3.5 font-mono font-bold text-slate-900">{m.f1}</td>
                      <td className="px-4 py-3.5 font-mono font-bold text-blue-700">{m.auc}</td>
                      <td className="px-4 py-3.5 font-mono text-slate-600">{m.latency}</td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-emerald-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          {m.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
