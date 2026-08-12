"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getEvent, submitFeedback } from "@/lib/api";
import type { FeedbackAction, QueryResult } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { PipelineCascade } from "@/components/PipelineCascade";
import { VerdictBadge } from "@/components/VerdictBadge";
import { RiskScore } from "@/components/RiskScore";
import { DomainCell } from "@/components/DomainCell";

const FEEDBACK_ACTIONS: FeedbackAction[] = [
  "Confirmed Threat",
  "False Positive",
  "Needs Investigation",
];

function toastMessage(action: FeedbackAction): string {
  switch (action) {
    case "Confirmed Threat":
      return "Marked as confirmed threat";
    case "False Positive":
      return "Marked as false positive";
    case "Needs Investigation":
      return "Marked as needs investigation";
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
      .catch(() => router.push("/app/queue"))
      .finally(() => setLoading(false));
  }, [id, router]);

  async function handleFeedback(action: FeedbackAction) {
    await submitFeedback(id, action);
    setToast(toastMessage(action));
    setTimeout(() => setToast(null), 3000);
  }

  if (loading) {
    return <p className="text-sm text-muted">Loading investigation…</p>;
  }

  if (!event) return null;

  const features = event.lexical_features;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href="/app/queue"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-text"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to queue
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <DomainCell domain={event.domain} maxWidth={9999} className="text-lg" />
          <p className="mt-1 font-mono text-xs text-muted">{formatDateTime(event.timestamp)}</p>
        </div>
        <div className="flex items-center gap-3">
          <VerdictBadge verdict={event.verdict} />
          <RiskScore score={event.risk_score} />
        </div>
      </div>

      <section className="rounded-lg border border-line bg-panel p-5">
        <h2 className="font-display text-lg font-semibold text-text">Pipeline replay</h2>
        <div className="mt-4">
          <PipelineCascade
            pipeline={event.pipeline}
            lexicalChars={event.lexical_chars}
            animate
          />
        </div>
      </section>

      {features && (
        <section className="rounded-lg border border-line bg-panel p-5">
          <h2 className="font-display text-lg font-semibold text-text">Lexical features</h2>
          <table className="mt-4 w-full text-sm">
            <tbody>
              {Object.entries(features).map(([key, value]) => (
                <tr key={key} className="border-b border-line last:border-0">
                  <td className="py-2 pr-4 text-muted">{key.replace(/_/g, " ")}</td>
                  <td className="py-2 font-mono text-text">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {event.behavioral_context && (
        <section className="rounded-lg border border-line bg-panel p-5">
          <h2 className="font-display text-lg font-semibold text-text">Behavioral context</h2>
          <p className="mt-2 text-sm text-muted">{event.behavioral_context}</p>
        </section>
      )}

      <section className="rounded-lg border border-line bg-panel p-5">
        <h2 className="font-display text-lg font-semibold text-text">Analyst actions</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {FEEDBACK_ACTIONS.map((action) => (
            <button
              key={action}
              type="button"
              onClick={() => handleFeedback(action)}
              className="rounded-lg border border-line bg-panel-raised px-4 py-2 text-sm text-text transition-colors duration-120 hover:border-trace/50"
            >
              {action}
            </button>
          ))}
        </div>
        {toast && (
          <p className="mt-3 text-sm text-trace" role="status">
            {toast}
          </p>
        )}
      </section>

      <div className="font-mono text-xs text-muted">
        <span>Client: {event.client_ip}</span>
        {event.source && <span className="ml-4">Source: {event.source}</span>}
        {event.decided_by && <span className="ml-4">Decision: {event.decided_by}</span>}
      </div>
    </div>
  );
}
