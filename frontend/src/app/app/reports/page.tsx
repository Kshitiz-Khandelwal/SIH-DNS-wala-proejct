"use client";

import { useState } from "react";
import {
  FileText,
  Download,
  Calendar,
  CheckCircle2,
  Clock,
  Shield,
  FileCheck,
  Printer,
  Sparkles,
  Award,
  Lock,
  FileSpreadsheet,
} from "lucide-react";
import { cn } from "@/lib/utils";

const COMPLIANCE_FRAMEWORKS = [
  {
    name: "NIST SP 800-81-2 (DNS Security)",
    score: "100% Compliant",
    status: "Passing",
    controls: "14 of 14 Controls Verified",
    summary: "Mandatory DNSSEC validation, recursive query rate-limiting, and encrypted DoH/DoT transport.",
  },
  {
    name: "ISO/IEC 27001:2022 (Annex A.12)",
    score: "98.4% Compliant",
    status: "Passing",
    controls: "28 of 28 Logging Controls",
    summary: "Immutable audit trails, client IP anonymization options, and high-availability failover.",
  },
  {
    name: "CISA Zero Trust DNS Architecture",
    score: "Optimal (Tier 4)",
    status: "Passing",
    controls: "Continuous Automated Defense",
    summary: "Active real-time heuristic blocking, machine learning DGA detection, and telemetry integration.",
  },
];

const REPORTS = [
  {
    id: "rep-01",
    title: "Executive SOC Threat Defense Briefing",
    period: "August 1 - August 18, 2026",
    type: "Executive PDF",
    threatsBlocked: "1,429",
    size: "2.4 MB",
    generated: "Today at 08:00 AM",
    description: "High-level summary of total recursive queries, threat mitigation rates, and top infected internal endpoints.",
  },
  {
    id: "rep-02",
    title: "NIST SP 800-81-2 & ISO 27001 Compliance Audit",
    period: "July 2026 (Full Month)",
    type: "Compliance Audit",
    threatsBlocked: "8,920",
    size: "4.8 MB",
    generated: "Aug 1, 2026",
    description: "Detailed regulatory audit log containing cryptographic verification, access control logs, and resolver uptime.",
  },
  {
    id: "rep-03",
    title: "DGA & Algorithmic Domain Forensics Dump",
    period: "Last 7 Days",
    type: "Forensics CSV / JSON",
    threatsBlocked: "340",
    size: "1.1 MB",
    generated: "Yesterday",
    description: "Raw telemetry dump including Shannon entropy values, character n-grams, and SHAP decision explanations.",
  },
  {
    id: "rep-04",
    title: "DNS Tunnel & Covert Channel Incident Report",
    period: "Last 30 Days",
    type: "Incident Report",
    threatsBlocked: "84",
    size: "820 KB",
    generated: "3 days ago",
    description: "In-depth breakdown of detected Base32/Base64 DNS exfiltration attempts and isolated endpoints.",
  },
];

export default function ReportsPage() {
  const [generating, setGenerating] = useState(false);

  function handleGenerateNew() {
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      alert("New SOC Executive Report compiled successfully. Ready for PDF download.");
    }, 1200);
  }

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl font-sans">
              Security Reports &amp; Regulatory Compliance
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-semibold text-blue-700">
              <FileCheck className="h-3.5 w-3.5" /> NIST SP 800-81-2 &middot; ISO 27001
            </span>
          </div>
          <p className="mt-1.5 text-sm text-slate-600">
            Generate executive briefings, forensic audit dumps, and automated regulatory compliance scorecards.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleGenerateNew}
            disabled={generating}
            className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-all shadow-xs disabled:opacity-50"
          >
            <Sparkles className={cn("h-3.5 w-3.5", generating && "animate-spin")} />
            {generating ? "Compiling Report…" : "Compile Executive Report"}
          </button>
        </div>
      </div>

      {/* Compliance Framework Scorecards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {COMPLIANCE_FRAMEWORKS.map((fw) => (
          <div key={fw.name} className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                  REGULATORY AUDIT
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" /> {fw.status}
                </span>
              </div>
              <h2 className="text-sm font-bold text-slate-900">{fw.name}</h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{fw.summary}</p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between font-mono text-xs">
              <span className="font-bold text-emerald-700">{fw.score}</span>
              <span className="text-slate-400">{fw.controls}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Reports Table */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
          AUDIT ARCHIVE
        </span>
        <h2 className="text-base font-bold text-slate-900 mt-0.5 mb-4">
          Generated Security Briefings &amp; Telemetry Exports
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-mono bg-slate-50/50">
                <th className="px-4 py-2.5 font-medium">Report Title</th>
                <th className="px-4 py-2.5 font-medium">Reporting Period</th>
                <th className="px-4 py-2.5 font-medium">Format</th>
                <th className="px-4 py-2.5 font-medium">Threats Documented</th>
                <th className="px-4 py-2.5 font-medium">File Size</th>
                <th className="px-4 py-2.5 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {REPORTS.map((rep) => (
                <tr key={rep.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-4 font-semibold text-slate-900 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100 shrink-0">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <span>{rep.title}</span>
                      <span className="block font-normal text-[11px] text-slate-500 mt-0.5">{rep.description}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 font-mono text-slate-600 whitespace-nowrap">{rep.period}</td>
                  <td className="px-4 py-4">
                    <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-slate-700 border border-slate-200">
                      {rep.type}
                    </span>
                  </td>
                  <td className="px-4 py-4 font-mono font-bold text-rose-600">{rep.threatsBlocked}</td>
                  <td className="px-4 py-4 font-mono text-slate-500">{rep.size}</td>
                  <td className="px-4 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => alert(`Downloading "${rep.title}" (${rep.size})...`)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition shadow-2xs"
                    >
                      <Download className="h-3 w-3" />
                      Download
                    </button>
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
