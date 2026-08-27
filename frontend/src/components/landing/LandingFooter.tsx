"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { Shield, Github, ExternalLink } from "lucide-react";

export function LandingFooter() {
  return (
    <motion.footer
      className="bg-white py-8 border-t border-line"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3, duration: 0.5 }}
    >
      <div className="mx-auto flex max-w-[1120px] flex-col items-start justify-between gap-4 px-6 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-trace" />
          <p className="font-display text-sm font-semibold text-text">DNS SHIELD</p>
        </div>

        <div className="flex items-center gap-6">
          <a
            href="https://github.com/Kshitiz-Khandelwal/SIH-DNS-wala-proejct"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors duration-150 hover:text-text"
          >
            <Github className="h-3.5 w-3.5" />
            Repository
            <ExternalLink className="h-3 w-3 opacity-50" />
          </a>
          <a
            href="#integration"
            className="text-sm text-muted transition-colors duration-150 hover:text-text"
          >
            API Docs
          </a>
          <Link
            href="/app/dashboard"
            className="inline-flex items-center gap-1 rounded-lg border border-line px-3 py-1.5 text-sm text-muted transition-all hover:border-trace hover:text-trace"
          >
            Dashboard →
          </Link>
        </div>
      </div>

      <div className="mx-auto mt-6 max-w-[1120px] border-t border-line px-6 pt-6">
        <p className="font-mono text-[11px] text-muted">
          SIH 2026 · Kshitiz Khandelwal · DNS Shield — Explainable DNS Threat Detection
        </p>
      </div>
    </motion.footer>
  );
}
