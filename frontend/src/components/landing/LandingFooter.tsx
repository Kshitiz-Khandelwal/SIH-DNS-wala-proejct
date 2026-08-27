"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { Shield, ExternalLink } from "lucide-react";

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

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
            <GithubIcon className="h-3.5 w-3.5" />
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
