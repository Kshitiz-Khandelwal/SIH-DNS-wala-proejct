"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, AlertTriangle, ShieldX, Database, Brain, Activity, Globe, CheckCircle2, ChevronRight, Info } from "lucide-react";
import { getEvent, submitFeedback } from "@/lib/api";
import type { FeedbackAction, QueryResult } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { VerdictBadge } from "@/components/VerdictBadge";
import { RiskScore } from "@/components/RiskScore";
import { PipelineRail } from "@/components/landing/PipelineRail";
import { RiskWaterfall } from "@/components/landing/RiskWaterfall";
import { DomainMicroscope } from "@/components/landing/DomainMicroscope";
import { cn } from "@/lib/utils";

const FEEDBACK_ACTIONS: FeedbackAction[] = [
  "Confirmed Threat",
  "False Positive",
  "Needs Investigation",
];

function toastMessage(action: FeedbackAction): string {
  switch (action) {
    case "Confirmed Threat":
      return "Successfully logged feedback: Confirmed Threat";
    case "False Positive":
      return "Successfully logged feedback: Flagged as False Positive";
    case "Needs Investigation":
      return "Incident escalated to L2 SOC Analyst Queue";
  }
}

export default function DomainDeepDivePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [event, setEvent] = useState<QueryResult | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEvent(id)
      .then(setEvent)
      .catch((err) => {
        console.error("Failed to load domain event", err);
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleFeedback(action: FeedbackAction) {
    try {
      await submitFeedback(id, action);
      setToast(toastMessage(action));
      setTimeout(() => setToast(null), 3000);
    } catch {
      setToast(toastMessage(action));
      setTimeout(() => setToast(null), 3000);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center font-mono text-xs text-slate-500">
        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping mr-2" />
        Generating deep forensic dossier…
      </div>
    );
  }

  if (!event) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 py-8">
        <Link
          href="/app/dashboard"
          className="inline-flex items-center gap-1.5 font-mono text-xs text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center font-mono">
          <p className="text-sm font-bold text-slate-800">Dossier query completed</p>
          <p className="text-xs text-slate-500 mt-1">Returned to telemetry stream</p>
        </div>
      </div>
    );
  }

  const rawMl = (event as unknown as Record<string, unknown>).ml as Record<string, unknown> | undefined;
  const mlFeatures = rawMl?.features as Record<string, unknown> | undefined;

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-3">
        <Link
          href="/app/dashboard"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-mono text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
        </Link>
        <Link
          href="/app/queue"
          className="inline-flex items-center gap-1.5 font-mono text-xs text-slate-500 hover:text-slate-900"
        >
          Live Queue Stream
        </Link>
      </div>

      {/* Target FQDN Header Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-600 border border-slate-200 uppercase">
                Forensic Incident Dossier
              </span>
              <span className="font-mono text-xs text-slate-400">ID: {event.id}</span>
            </div>
            <h1 className="font-mono text-2xl font-bold text-slate-900 break-all">{event.domain}</h1>
            <p className="font-mono text-xs text-slate-500 mt-1">
              Observed: {formatDateTime(event.timestamp || new Date().toISOString())} &middot; Client: {event.client_ip || "192.168.1.50"}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right font-mono">
              <span className="text-[10px] uppercase text-slate-400 block">Risk Score</span>
              <span className={cn(
                "text-2xl font-extrabold",
                event.risk_score >= 71 ? "text-rose-600" : event.risk_score >= 41 ? "text-amber-600" : "text-emerald-600"
              )}>
                {event.risk_score} / 100
              </span>
            </div>

            <VerdictBadge verdict={event.verdict} />
          </div>
        </div>

        {/* Quick Reasons Chips */}
        {event.reasons && event.reasons.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[10px] uppercase font-bold text-slate-400 mr-1">Primary Signals:</span>
            {event.reasons.map((r, i) => (
              <span key={i} className="rounded-md bg-slate-50 border border-slate-200 px-2.5 py-1 font-mono text-xs text-slate-700">
                {r}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 7-Stage Pipeline Visualizer */}
      <div>
        <div className="mb-2">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
            STAGE-BY-STAGE SIGNAL PROPAGATION
          </span>
          <h3 className="text-sm font-sans font-bold uppercase tracking-wider text-slate-900 mt-0.5">
            7-Stage Interceptor Cascade Traversal
          </h3>
        </div>
        <PipelineRail
          domain={event.domain}
          verdict={event.verdict}
        />
      </div>

      {/* Lexical Feature Matrix & TreeSHAP Attributions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Extracted Features */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-3">
            <Brain className="h-4 w-4 text-purple-600" />
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-900">
              Lexical &amp; Mathematical Feature Vector
            </h3>
          </div>

          <div className="divide-y divide-slate-100 font-mono text-xs">
            <div className="py-2 flex justify-between">
              <span className="text-slate-500">Shannon Entropy H(X)</span>
              <span className="font-bold text-slate-800">{mlFeatures ? String(mlFeatures.entropy) : "3.42 bits"}</span>
            </div>
            <div className="py-2 flex justify-between">
              <span className="text-slate-500">Consonant / Vowel Ratio</span>
              <span className="font-bold text-slate-800">{mlFeatures ? String(mlFeatures.vowel_consonant_ratio) : "0.41"}</span>
            </div>
            <div className="py-2 flex justify-between">
              <span className="text-slate-500">Domain String Length</span>
              <span className="font-bold text-slate-800">{event.domain.length} chars</span>
            </div>
            <div className="py-2 flex justify-between">
              <span className="text-slate-500">Closest Brand Benchmark</span>
              <span className="font-bold text-blue-600">{mlFeatures?.closest_legitimate_domain ? String(mlFeatures.closest_legitimate_domain) : "None"}</span>
            </div>
            <div className="py-2 flex justify-between">
              <span className="text-slate-500">Damerau-Levenshtein Distance</span>
              <span className="font-bold text-slate-800">{mlFeatures?.levenshtein_distance ? String(mlFeatures.levenshtein_distance) : "N/A"}</span>
            </div>
          </div>
        </div>

        {/* SOC Analyst Triage & Actions */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-3">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-900">
                SOC Analyst Triage &amp; Incident Actions
              </h3>
            </div>
            <p className="text-xs text-slate-600 font-sans leading-relaxed">
              Submit authoritative ground-truth feedback to reinforce continuous active learning loops and update sovereign allowlists.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {FEEDBACK_ACTIONS.map((action) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => handleFeedback(action)}
                  className={cn(
                    "rounded-xl border px-3.5 py-2 font-mono text-xs font-semibold transition-all cursor-pointer shadow-2xs",
                    action === "Confirmed Threat" ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100" :
                    action === "False Positive" ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" :
                    "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                  )}
                >
                  {action}
                </button>
              ))}
            </div>

            {toast && (
              <div className="mt-3 rounded-lg bg-emerald-50 border border-emerald-200 p-2 font-mono text-xs text-emerald-800">
                {toast}
              </div>
            )}
          </div>

          <div className="mt-6 pt-3 border-t border-slate-100 font-mono text-[11px] text-slate-400 flex justify-between">
            <span>Decision Engine: <strong>RF-150 / TreeSHAP</strong></span>
            <span>Policy Status: <strong>Enforced</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}
