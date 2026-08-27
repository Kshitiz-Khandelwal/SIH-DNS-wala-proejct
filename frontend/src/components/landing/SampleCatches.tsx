"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { queryDomain } from "@/lib/api";
import type { QueryResult } from "@/lib/types";
import { SAMPLE_DOMAINS } from "@/lib/pipeline-engine";
import { VerdictBadge } from "@/components/VerdictBadge";
import { RiskScore } from "@/components/RiskScore";
import { useInView } from "@/hooks/useInView";
import { Play, RefreshCw } from "lucide-react";

export function SampleCatches() {
  const [results, setResults] = useState<Record<string, QueryResult>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const { ref, inView } = useInView();

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
    <section ref={ref as React.RefObject<HTMLElement>} className="border-b border-line bg-slate-50 py-10 md:py-16">
      <div className="mx-auto max-w-[1120px] px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="mb-2 font-mono text-[11px] font-medium uppercase tracking-wider text-muted">
            Sample catches
          </p>
          <h2 className="font-display text-[28px] font-bold tracking-tight text-text md:text-[36px]">
            Concrete examples.
          </h2>
          <p className="mt-2 text-sm text-muted">
            Including domains correctly left alone.
          </p>
        </motion.div>

        <div className="mt-8 space-y-3">
          {SAMPLE_DOMAINS.map(({ domain, label }, i) => {
            const result = results[domain];
            const isLoading = loading === domain;

            return (
              <motion.div
                key={domain}
                initial={{ opacity: 0, x: -20 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.45, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ x: 4, transition: { type: "spring", stiffness: 400, damping: 25 } }}
                className="flex flex-col gap-3 rounded-xl border border-line bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-mono text-sm font-medium text-text">{domain}</p>
                  <p className="mt-0.5 text-xs text-muted">{label}</p>
                </div>

                <div className="flex items-center gap-3">
                  <AnimatePresence>
                    {result && (
                      <motion.div
                        className="flex items-center gap-3"
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      >
                        <VerdictBadge verdict={result.verdict} glow={false} />
                        <RiskScore score={result.risk_score} showBar={false} />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.button
                    type="button"
                    onClick={() => runSample(domain)}
                    disabled={isLoading}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-medium text-text transition-all hover:border-trace hover:text-trace hover:bg-emerald-50 disabled:opacity-50"
                    whileTap={{ scale: 0.95 }}
                  >
                    {isLoading ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      <Play className="h-3 w-3" />
                    )}
                    {isLoading ? "Running…" : result ? "Re-run" : "Run scan"}
                  </motion.button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
