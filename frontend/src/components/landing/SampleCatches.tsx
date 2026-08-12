"use client";

import { useState } from "react";
import { queryDomain } from "@/lib/api";
import type { QueryResult } from "@/lib/types";
import { SAMPLE_DOMAINS } from "@/lib/pipeline-engine";
import { VerdictBadge } from "@/components/VerdictBadge";
import { RiskScore } from "@/components/RiskScore";

export function SampleCatches() {
  const [results, setResults] = useState<Record<string, QueryResult>>({});
  const [loading, setLoading] = useState<string | null>(null);

  async function runSample(domain: string) {
    setLoading(domain);
    try {
      const res = await queryDomain(domain);
      setResults((prev) => ({ ...prev, [domain]: res }));
    } finally {
      setLoading(null);
    }
  }

  return (
    <section className="border-b border-line py-14 md:py-24">
      <div className="mx-auto max-w-[1120px] px-6">
        <h2 className="font-display text-[32px] font-semibold leading-[38px] tracking-tight text-text">
          Sample catches
        </h2>
        <p className="mt-3 text-sm text-muted">
          Concrete examples — including domains correctly left alone.
        </p>
        <div className="mt-8 space-y-3">
          {SAMPLE_DOMAINS.map(({ domain, label }) => {
            const result = results[domain];
            return (
              <div
                key={domain}
                className="flex flex-col gap-3 rounded-lg border border-line bg-panel p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-mono text-sm text-text">{domain}</p>
                  <p className="mt-0.5 text-xs text-muted">{label}</p>
                </div>
                <div className="flex items-center gap-3">
                  {result && (
                    <>
                      <VerdictBadge verdict={result.verdict} glow={false} />
                      <RiskScore score={result.risk_score} showBar={false} />
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => runSample(domain)}
                    disabled={loading === domain}
                    className="rounded-lg border border-line bg-panel-raised px-3 py-1.5 text-xs text-trace transition-colors duration-120 hover:bg-panel"
                  >
                    {loading === domain ? "Running…" : result ? "Re-run" : "Run scan"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
