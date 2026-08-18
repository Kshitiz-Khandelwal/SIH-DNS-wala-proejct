"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ShieldAlert, ShieldCheck } from "lucide-react";
import { getEvents, queryDomain } from "@/lib/api";
import type { QueryResult } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { PipelineCascade } from "@/components/PipelineCascade";
import { VerdictBadge } from "@/components/VerdictBadge";

function DomainDetailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const domain = searchParams.get("d") || "";
  const [event, setEvent] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!domain) {
      router.push("/app/dashboard");
      return;
    }

    getEvents(50)
      .then(async (events) => {
        const match = events.find((e) => e.domain.toLowerCase() === domain.toLowerCase());
        if (match) {
          setEvent(match);
        } else {
          const res = await queryDomain(domain);
          setEvent(res);
        }
      })
      .catch(async () => {
        try {
          const res = await queryDomain(domain);
          setEvent(res);
        } catch {
          // fallback
        }
      })
      .finally(() => setLoading(false));
  }, [domain, router]);

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-slate-500 font-mono">
        Inspecting domain telemetry for {domain}…
      </div>
    );
  }

  if (!event) return null;

  return (
    <div className="w-full space-y-6 pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5">
        <div>
          <Link
            href="/app/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 mb-2 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-sans">
              {event.domain}
            </h1>
            <VerdictBadge verdict={event.verdict} />
          </div>
          <p className="mt-1 text-xs text-slate-500 font-mono">
            Observed at {formatDateTime(event.timestamp)} · Client: {event.client_ip}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-right shadow-xs">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">Risk Score</span>
            <span className="text-2xl font-bold font-mono text-slate-900">{event.risk_score} / 100</span>
          </div>
        </div>
      </div>

      {/* 7-Stage Cascade */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider">
          7-Stage Pipeline Evaluation Trace
        </h2>
        <PipelineCascade
          pipeline={event.pipeline}
          lexicalChars={event.lexical_chars}
          animate
        />
      </div>

      {/* Lexical Details */}
      {event.lexical_features && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">
            Lexical &amp; Structural Features
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Object.entries(event.lexical_features).map(([k, v]) => (
              <div key={k} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <span className="text-[11px] text-slate-500 block capitalize">{k.replace(/_/g, " ")}</span>
                <span className="font-mono text-sm font-bold text-slate-900 mt-0.5 block">{typeof v === "number" ? v.toFixed(3) : String(v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DomainInspectPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm font-mono text-slate-400">Loading domain inspection…</div>}>
      <DomainDetailContent />
    </Suspense>
  );
}
