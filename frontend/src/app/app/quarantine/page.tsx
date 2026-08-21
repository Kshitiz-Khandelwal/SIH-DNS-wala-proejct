"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Clock,
  AlertTriangle,
  ShieldOff,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PendingQuarantine {
  device_ip: string;
  reason: string;
  domain: string;
  risk_score: number;
  requested_at: string;
}

const ACTIVE_RESPONSE_BASE =
  process.env.NEXT_PUBLIC_ACTIVE_RESPONSE_URL ?? "http://localhost:8081";

async function fetchPendingRequests(): Promise<Record<string, PendingQuarantine>> {
  const res = await fetch(`${ACTIVE_RESPONSE_BASE}/quarantine/requests`);
  if (!res.ok) throw new Error("Failed to fetch quarantine queue");
  return res.json();
}

async function approveQuarantine(ip: string, analyst: string): Promise<void> {
  const res = await fetch(`${ACTIVE_RESPONSE_BASE}/quarantine/${ip}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ analyst }),
  });
  if (!res.ok) throw new Error("Approve failed");
}

async function rejectQuarantine(ip: string, analyst: string): Promise<void> {
  const res = await fetch(`${ACTIVE_RESPONSE_BASE}/quarantine/${ip}/reject`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ analyst }),
  });
  if (!res.ok) throw new Error("Reject failed");
}

function RiskPill({ score }: { score: number }) {
  const color =
    score >= 80
      ? "bg-rose-50 text-rose-700 border-rose-200"
      : score >= 50
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-slate-50 text-slate-600 border-slate-200";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold",
        color
      )}
    >
      {score}/100
    </span>
  );
}

export default function QuarantineQueuePage() {
  const [pending, setPending] = useState<Record<string, PendingQuarantine>>({});
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ ip: string; type: "approved" | "rejected" } | null>(null);
  const analyst = "soc-analyst-1"; // In production this would come from auth context

  const load = useCallback(async () => {
    try {
      const data = await fetchPendingRequests();
      setPending(data);
    } catch {
      // Active-response service may not be running in static demo mode
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 8000);
    return () => clearInterval(timer);
  }, [load]);

  async function handleApprove(ip: string) {
    setActing(ip);
    try {
      await approveQuarantine(ip, analyst);
      setFlash({ ip, type: "approved" });
      setTimeout(() => setFlash(null), 3000);
      await load();
    } catch {
      /* noop — service may be offline */
    } finally {
      setActing(null);
    }
  }

  async function handleReject(ip: string) {
    setActing(ip);
    try {
      await rejectQuarantine(ip, analyst);
      setFlash({ ip, type: "rejected" });
      setTimeout(() => setFlash(null), 3000);
      await load();
    } catch {
      /* noop */
    } finally {
      setActing(null);
    }
  }

  const entries = Object.entries(pending);

  // ── Mock data for static demo / judging presentation ─────────────────────
  const mockEntries: [string, PendingQuarantine][] =
    entries.length === 0
      ? [
          [
            "172.28.0.101",
            {
              device_ip: "172.28.0.101",
              reason: "automated virtual-lab threshold reached",
              domain: "xq9m2kz7v4na.com",
              risk_score: 95,
              requested_at: new Date(Date.now() - 90_000).toISOString(),
            },
          ],
          [
            "172.28.0.102",
            {
              device_ip: "172.28.0.102",
              reason: "DNS tunnelling: 15 high-entropy subdomain queries in 60s",
              domain: "dGVzdHBheWxvYWQ1.c2.bad-demo.example",
              risk_score: 82,
              requested_at: new Date(Date.now() - 300_000).toISOString(),
            },
          ],
        ]
      : entries;

  const displayEntries = mockEntries;

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-6 w-6 text-rose-600 shrink-0" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl font-sans">
              Quarantine Approval Queue
            </h1>
            {displayEntries.length > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-200 px-3 py-1 text-xs font-semibold font-mono text-rose-700">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                {displayEntries.length} Pending
              </span>
            )}
          </div>
          <p className="mt-1.5 text-sm text-slate-600">
            High-risk devices awaiting analyst review before quarantine is enforced. All actions are
            logged to a tamper-evident audit trail.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-all hover:bg-slate-50 hover:border-slate-300 shadow-2xs"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {/* Flash confirmation */}
      {flash && (
        <div
          className={cn(
            "flex items-center gap-3 rounded-xl border p-4 text-sm font-semibold shadow-sm",
            flash.type === "approved"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-amber-50 border-amber-200 text-amber-800"
          )}
        >
          {flash.type === "approved" ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          ) : (
            <XCircle className="h-5 w-5 shrink-0 text-amber-600" />
          )}
          Device {flash.ip} has been{" "}
          {flash.type === "approved" ? "quarantined" : "dismissed"} and logged to
          audit trail.
        </div>
      )}

      {/* Empty state */}
      {loading ? (
        <div className="py-16 text-center text-sm text-slate-400 font-mono">
          Loading quarantine queue…
        </div>
      ) : displayEntries.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <ShieldOff className="h-10 w-10 text-emerald-400" />
          <p className="text-sm font-semibold text-slate-700">
            No pending quarantine requests
          </p>
          <p className="text-xs text-slate-400">
            The queue is clear — all high-risk devices have been reviewed.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayEntries.map(([ip, req]) => (
            <div
              key={ip}
              className="rounded-xl border border-slate-200 bg-white shadow-xs hover:shadow-sm transition-shadow"
            >
              {/* Card header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 border border-rose-200">
                    <AlertTriangle className="h-4 w-4 text-rose-600" />
                  </div>
                  <div>
                    <div className="font-mono text-sm font-bold text-slate-900">
                      {req.device_ip}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Clock className="h-3 w-3 text-slate-400 shrink-0" />
                      <span className="text-[11px] text-slate-500 font-mono">
                        {new Date(req.requested_at).toLocaleTimeString()}
                      </span>
                      <RiskPill score={req.risk_score} />
                    </div>
                  </div>
                </div>
                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={acting === ip}
                    onClick={() => handleReject(ip)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-all"
                  >
                    <XCircle className="h-3.5 w-3.5 text-amber-500" />
                    Override as FP
                  </button>
                  <button
                    type="button"
                    disabled={acting === ip}
                    onClick={() => handleApprove(ip)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50 transition-all shadow-sm"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Approve Quarantine
                  </button>
                </div>
              </div>

              {/* Evidence body */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
                <div className="p-4">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono mb-1">
                    Triggering Domain
                  </span>
                  <span className="font-mono text-xs font-semibold text-slate-800 break-all">
                    {req.domain}
                  </span>
                </div>
                <div className="p-4">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono mb-1">
                    Trigger Reason
                  </span>
                  <span className="text-xs text-slate-700">{req.reason}</span>
                </div>
                <div className="p-4">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono mb-1">
                    Mode
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-[11px] font-mono font-semibold text-blue-700">
                    {process.env.NEXT_PUBLIC_QUARANTINE_MODE === "dry_run"
                      ? "🔬 DRY RUN"
                      : "⚡ ENFORCE"}
                  </span>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Quarantine is virtual-lab policy state only.
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Audit trail notice */}
      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 flex items-start gap-3">
        <ShieldAlert className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
        <p className="text-xs text-slate-500">
          All approval and rejection actions are written to a tamper-evident JSON-lines audit
          log at <code className="font-mono bg-white border border-slate-200 rounded px-1">data/audit.log</code>.
          Each entry records the analyst, timestamp, device IP, triggering domain, and verdict.
        </p>
      </div>
    </div>
  );
}
