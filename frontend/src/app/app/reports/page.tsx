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
} from "lucide-react";
import { cn } from "@/lib/utils";

const REPORTS = [
  {
    id: "rep-01",
    title: "Executive Threat Defense Summary",
    period: "August 1 - August 18, 2026",
    type: "Executive PDF",
    threatsBlocked: "1,429",
    size: "2.4 MB",
    generated: "Today at 08:00 AM",
  },
  {
    id: "rep-02",
    title: "DNS Security & SLA Compliance Audit",
    period: "July 2026 (Full Month)",
    type: "Compliance ISO 27001",
    threatsBlocked: "8,920",
    size: "4.8 MB",
    generated: "Aug 1, 2026",
  },
  {
    id: "rep-03",
    title: "DGA & Algorithm Domain Incidents Log",
    period: "Last 7 Days",
    type: "Forensics CSV / JSON",
    threatsBlocked: "340",
    size: "1.1 MB",
    generated: "Yesterday",
  },
  {
    id: "rep-04",
    title: "DNS Tunnel & Exfiltration Forensic Report",
    period: "Last 30 Days",
    type: "Incident Report",
    threatsBlocked: "84",
    size: "820 KB",
    generated: "3 days ago",
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
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl font-sans">
              Security Reports &amp; Exports
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-semibold text-blue-700">
              <FileCheck className="h-3.5 w-3.5" /> Audit Ready
            </span>
          </div>
          <p className="mt-1.5 text-sm text-slate-600">
            Generate executive briefings, forensic audit dumps, and automated compliance summaries.
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
            {generating ? "Compiling Report…" : "Generate New Report"}
          </button>
        </div>
      </div>

      {/* Reports Table */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
          ARCHIVE
        </span>
        <h2 className="text-base font-bold text-slate-900 mt-0.5 mb-4">
          Generated Security Briefings &amp; Audits
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-mono">
                <th className="pb-2 font-medium">Report Title</th>
                <th className="pb-2 font-medium">Reporting Interval</th>
                <th className="pb-2 font-medium">Format / Type</th>
                <th className="pb-2 font-medium">Threats Cataloged</th>
                <th className="pb-2 font-medium">File Size</th>
                <th className="pb-2 text-right font-medium">Download</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {REPORTS.map((rep) => (
                <tr key={rep.id} className="hover:bg-slate-50/50">
                  <td className="py-4 font-semibold text-slate-900 flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100 shrink-0">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <span>{rep.title}</span>
                      <span className="block font-mono text-[10px] text-slate-400 font-normal">Generated: {rep.generated}</span>
                    </div>
                  </td>
                  <td className="py-4 font-mono text-slate-600">{rep.period}</td>
                  <td className="py-4">
                    <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-slate-700 border border-slate-200">
                      {rep.type}
                    </span>
                  </td>
                  <td className="py-4 font-mono font-bold text-rose-600">{rep.threatsBlocked}</td>
                  <td className="py-4 font-mono text-slate-500">{rep.size}</td>
                  <td className="py-4 text-right">
                    <button
                      type="button"
                      onClick={() => alert(`Downloading "${rep.title}"...`)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition shadow-2xs"
                    >
                      <Download className="h-3 w-3" />
                      PDF
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
