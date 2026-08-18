"use client";

import { useState } from "react";
import {
  Brain,
  Cpu,
  HelpCircle,
  Layers,
  Sparkles,
  Zap,
  Info,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SHAP_FEATURES = [
  {
    name: "Shannon Entropy (Bits)",
    val: "4.28 / 5.0",
    shap: +0.342,
    impact: "DGA / Randomness Signal",
    direction: "risk",
  },
  {
    name: "N-gram Perplexity Score",
    val: "0.89",
    shap: +0.281,
    impact: "Uncommon Consonant Cluster",
    direction: "risk",
  },
  {
    name: "Vowel-to-Consonant Ratio",
    val: "0.14",
    shap: +0.185,
    impact: "Abnormal Phonetics",
    direction: "risk",
  },
  {
    name: "Domain Character Length",
    val: "26 chars",
    shap: +0.112,
    impact: "High String Length",
    direction: "risk",
  },
  {
    name: "Levenshtein Brand Distance",
    val: "0.08",
    shap: -0.054,
    impact: "Not Brand Lookalike",
    direction: "safe",
  },
  {
    name: "Alexa / Tranco Top 1M Rank",
    val: "Unranked",
    shap: +0.098,
    impact: "Zero Prior Authority",
    direction: "risk",
  },
];

const MODELS = [
  {
    name: "DGA Classifier (RF-V2)",
    type: "Random Forest (150 trees)",
    accuracy: "99.4%",
    f1: "0.992",
    latency: "1.1ms",
    trainedOn: "1.2M labeled domains",
    status: "Active · Primary",
  },
  {
    name: "Homoglyph Detector",
    type: "Unicode Confusable Matrix + Levenshtein",
    accuracy: "98.8%",
    f1: "0.985",
    latency: "0.8ms",
    trainedOn: "Top 500 Global Brand Names",
    status: "Active",
  },
  {
    name: "Tunnel Payload Heuristic",
    type: "Subdomain Base32 / TXT Exfil Net",
    accuracy: "97.9%",
    f1: "0.976",
    latency: "1.2ms",
    trainedOn: "Iodine & dnscat2 PCAP captures",
    status: "Active",
  },
];

export default function XaiPage() {
  const [testDomain, setTestDomain] = useState("xk9mqz7p2n4r8v3w.top");
  const [entropy, setEntropy] = useState(4.28);
  const [charLength, setCharLength] = useState(26);

  function calculateSampleEntropy(str: string) {
    if (!str) return 0;
    const len = str.length;
    const freqs: Record<string, number> = {};
    for (const c of str) freqs[c] = (freqs[c] || 0) + 1;
    return Object.values(freqs).reduce((acc, f) => {
      const p = f / len;
      return acc - p * Math.log2(p);
    }, 0);
  }

  function handleDomainChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setTestDomain(val);
    setCharLength(val.length);
    setEntropy(Number(calculateSampleEntropy(val).toFixed(2)));
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl font-sans">
              Explainable AI (XAI) Analysis
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 border border-purple-200 px-3 py-1 text-xs font-semibold text-purple-700">
              <Brain className="h-3.5 w-3.5" /> SHAP TreeExplainer
            </span>
          </div>
          <p className="mt-1.5 text-sm text-slate-600">
            Interpret machine learning predictions, examine feature contributions, and audit decision boundaries in real time.
          </p>
        </div>
      </div>

      {/* SHAP Explanation Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 border-b border-slate-100 pb-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
              SHAPLEY CONTRIBUTION VALUES
            </span>
            <h2 className="text-base font-bold text-slate-900 mt-0.5">
              Feature Impact on Prediction Verdict
            </h2>
          </div>
          <span className="font-mono text-xs text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1 rounded-full">
            Evaluated for: <strong className="text-slate-900 font-semibold">{testDomain}</strong>
          </span>
        </div>

        {/* Feature Table */}
        <div className="space-y-4">
          {SHAP_FEATURES.map((feat) => {
            const isRisk = feat.shap > 0;
            const barWidth = Math.min(100, Math.round(Math.abs(feat.shap) * 220));

            return (
              <div key={feat.name} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="w-64 shrink-0">
                  <span className="text-xs font-semibold text-slate-900 block">{feat.name}</span>
                  <span className="font-mono text-[11px] text-slate-500">Value: {feat.val}</span>
                </div>

                {/* Visual SHAP Bar */}
                <div className="flex-1 flex items-center gap-3">
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
                    {isRisk ? (
                      <div className="h-full bg-rose-500 rounded-full transition-all" style={{ width: `${barWidth}%` }} />
                    ) : (
                      <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${barWidth}%` }} />
                    )}
                  </div>
                  <span
                    className={cn(
                      "font-mono text-xs font-bold w-16 text-right shrink-0",
                      isRisk ? "text-rose-600" : "text-emerald-600"
                    )}
                  >
                    {isRisk ? `+${feat.shap.toFixed(3)}` : feat.shap.toFixed(3)}
                  </span>
                </div>

                <div className="w-48 shrink-0 text-right">
                  <span
                    className={cn(
                      "inline-block font-mono text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                      isRisk
                        ? "bg-rose-50 border-rose-200 text-rose-700"
                        : "bg-emerald-50 border-emerald-200 text-emerald-700"
                    )}
                  >
                    {feat.impact}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs flex items-start gap-3">
          <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-slate-600 leading-relaxed">
            <strong>How SHAP works in DNS Shield:</strong> Shapley Additive exPlanations allocate mathematical credit to each individual character n-gram, phonetic rarity, and entropy metric. Positive SHAP pushes the classification score toward <strong className="text-rose-700">BLOCK</strong>, while negative values indicate standard corporate naming conventions.
          </p>
        </div>
      </div>

      {/* Interactive Heuristic Sandbox */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
          INTERACTIVE ML SANDBOX
        </span>
        <h2 className="text-base font-bold text-slate-900 mt-0.5 mb-1">
          Test Domain String Against Real-Time Feature Extractor
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Type any domain name below to see instant calculated lexical entropy and structural features.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-mono font-medium text-slate-500 mb-1">
              INPUT DOMAIN STRING
            </label>
            <input
              type="text"
              value={testDomain}
              onChange={handleDomainChange}
              className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 font-mono text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all shadow-xs"
              placeholder="e.g. login-verify.security-auth.net"
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex flex-col justify-center">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Calculated Shannon Entropy</span>
            <span className="font-mono text-2xl font-bold text-slate-900">
              {entropy} <span className="text-xs font-normal text-slate-400">/ 5.00</span>
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
          <span className="text-xs text-slate-400 py-1">Try sample attack payloads:</span>
          {[
            "dga.xq9m2kz7v4na.com",
            "microsoft-security-auth.co",
            "google.com",
            "exfil.c2h1bmsx.tunnel.net",
          ].map((sample) => (
            <button
              key={sample}
              type="button"
              onClick={() => {
                setTestDomain(sample);
                setCharLength(sample.length);
                setEntropy(Number(calculateSampleEntropy(sample).toFixed(2)));
              }}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 font-mono text-[11px] text-slate-600 hover:border-slate-300 hover:text-slate-900 transition-all shadow-2xs"
            >
              {sample}
            </button>
          ))}
        </div>
      </div>

      {/* Model Inventory */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
          INFERENCE ENGINES
        </span>
        <h2 className="text-base font-bold text-slate-900 mt-0.5 mb-4">
          Production Machine Learning Model Registry
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-mono">
                <th className="pb-2 font-medium">Model Designation</th>
                <th className="pb-2 font-medium">Architecture</th>
                <th className="pb-2 font-medium">Accuracy</th>
                <th className="pb-2 font-medium">F1-Score</th>
                <th className="pb-2 font-medium">Latency</th>
                <th className="pb-2 text-right font-medium">Deployment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {MODELS.map((m) => (
                <tr key={m.name} className="hover:bg-slate-50/50">
                  <td className="py-3.5 font-bold text-slate-900 flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-blue-600 shrink-0" />
                    {m.name}
                  </td>
                  <td className="py-3.5 text-slate-600 font-mono">{m.type}</td>
                  <td className="py-3.5 font-mono font-semibold text-emerald-700">{m.accuracy}</td>
                  <td className="py-3.5 font-mono font-semibold text-emerald-700">{m.f1}</td>
                  <td className="py-3.5 font-mono text-slate-500">{m.latency}</td>
                  <td className="py-3.5 text-right">
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
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
  );
}
