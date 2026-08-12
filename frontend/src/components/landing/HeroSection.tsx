"use client";

import { useState } from "react";
import { queryDomain } from "@/lib/api";
import type { QueryResult } from "@/lib/types";
import { PipelineCascade } from "@/components/PipelineCascade";
import { VerdictBadge } from "@/components/VerdictBadge";
import { RiskScore } from "@/components/RiskScore";

export function HeroSection() {
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleScan(e: React.FormEvent) {
    e.preventDefault();
    if (!domain.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await queryDomain(domain.trim());
      setResult(res);
    } catch {
      setError("Scan failed. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="border-b border-line py-16 md:py-24">
      <div className="mx-auto max-w-[1120px] px-6">
        <h1 className="font-display text-[32px] font-bold leading-9 tracking-tight text-text md:text-[56px] md:leading-[60px]">
          Every DNS query scored.
          <br />
          <span className="text-trace">Every verdict explained.</span>
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-6 text-muted">
          DNS Shield runs each lookup through a 7-stage pipeline — cache, threat intel,
          ML lexical analysis, behavioral detection, geo, active response, and analytics —
          returning ALLOW, FLAG, or BLOCK with a full trace.
        </p>

        <form onSubmit={handleScan} className="mt-8 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="Enter a domain to scan…"
            className="flex-1 rounded-lg border border-line bg-panel px-4 py-3 font-mono text-sm text-text placeholder:text-muted focus:border-trace"
            aria-label="Domain to scan"
          />
          <button
            type="submit"
            disabled={loading || !domain.trim()}
            className="rounded-lg bg-trace px-6 py-3 text-sm font-medium text-ink transition-opacity duration-120 hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Scanning…" : "Run Pipeline"}
          </button>
        </form>

        {error && <p className="mt-4 text-sm text-alert">{error}</p>}

        {result && (
          <div className="mt-8 rounded-lg border border-line bg-panel p-6">
            <div className="mb-4 flex flex-wrap items-center gap-4">
              <span className="font-mono text-sm text-text">{result.domain}</span>
              <VerdictBadge verdict={result.verdict} />
              <RiskScore score={result.risk_score} />
            </div>
            <PipelineCascade
              pipeline={result.pipeline}
              lexicalChars={result.lexical_chars}
              animate
            />
          </div>
        )}
      </div>
    </section>
  );
}
