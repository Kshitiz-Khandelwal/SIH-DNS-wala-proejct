"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { queryDomain } from "@/lib/api";
import type { QueryResult } from "@/lib/types";
import { PipelineCascade } from "@/components/PipelineCascade";
import { VerdictBadge } from "@/components/VerdictBadge";
import { RiskScore } from "@/components/RiskScore";
import { Search, Loader2 } from "lucide-react";

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
    <section className="border-b border-line py-12 md:py-20 bg-white">
      <div className="mx-auto max-w-[1120px] px-6">

        {/* Eyebrow */}
        <motion.div
          className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-trace radar-beacon" />
          <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-trace">
            Live DNS Analysis Pipeline
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          className="font-display text-[36px] font-bold leading-[1.1] tracking-tight text-text md:text-[60px]"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
        >
          Every DNS query scored.
          <br />
          <span className="text-trace">Every verdict explained.</span>
        </motion.h1>

        {/* Sub */}
        <motion.p
          className="mt-4 max-w-2xl text-base leading-7 text-muted"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
        >
          DNS Shield runs each lookup through a 7-stage pipeline — cache, threat intel,
          ML lexical analysis, behavioral detection, geo, active response, and analytics —
          returning ALLOW, FLAG, or BLOCK with a full trace.
        </motion.p>

        {/* Scan form */}
        <motion.form
          onSubmit={handleScan}
          className="mt-8 flex flex-col gap-3 sm:flex-row"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.28, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="Enter a domain to scan…"
              className="w-full rounded-lg border border-line bg-white pl-10 pr-4 py-3 font-mono text-sm text-text placeholder:text-muted transition-colors focus:border-trace focus:outline-none focus:ring-2 focus:ring-trace/20"
              aria-label="Domain to scan"
            />
          </div>
          <motion.button
            type="submit"
            disabled={loading || !domain.trim()}
            className="flex items-center justify-center gap-2 rounded-lg bg-trace px-6 py-3 text-sm font-medium text-ink transition-all hover:bg-emerald-600 hover:shadow-lg disabled:opacity-50 active:scale-95"
            whileTap={{ scale: 0.97 }}
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Scanning…</>
            ) : (
              "Run Pipeline"
            )}
          </motion.button>
        </motion.form>

        <AnimatePresence>
          {error && (
            <motion.p
              className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-alert"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {result && (
            <motion.div
              className="mt-8 rounded-xl border border-line bg-white p-6 shadow-sm"
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
