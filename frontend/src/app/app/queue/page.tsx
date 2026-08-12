"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, RefreshCw } from "lucide-react";
import { getEndpoint, getEvents, getStats } from "@/lib/api";
import type { QueryResult, StatsResponse } from "@/lib/types";
import { formatTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { KPIStrip } from "@/components/KPIStrip";
import { DomainCell } from "@/components/DomainCell";
import { RiskScore } from "@/components/RiskScore";
import { VerdictBadge } from "@/components/VerdictBadge";
import { PipelineCascade } from "@/components/PipelineCascade";
import { EmptyState } from "@/components/EmptyState";

const POLL_MS = 5000;

export default function QueuePage() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [events, setEvents] = useState<QueryResult[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [endpoint, setEndpoint] = useState("udp://127.0.0.1:53");
  const [comfortable, setComfortable] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [s, e, cfg] = await Promise.all([getStats(), getEvents(), getEndpoint()]);
      setStats(s);
      setEvents(e);
      setEndpoint(cfg.endpoint);
      setError(null);
    } catch {
      setError("Live stream disconnected. Retrying…");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, POLL_MS);
    return () => clearInterval(interval);
  }, [fetchData]);

  const rowHeight = comfortable ? "h-11" : "h-9";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-text">Query Queue</h1>
          <p className="mt-1 text-sm text-muted">
            Live stream · polling every {POLL_MS / 1000}s
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs text-muted">
          <input
            type="checkbox"
            checked={comfortable}
            onChange={(e) => setComfortable(e.target.checked)}
            className="rounded border-line"
          />
          Comfortable density
        </label>
      </div>

      {stats && (
        <KPIStrip
          items={[
            { label: "Allowed (24h)", value: stats.allowed_24h, accent: "trace" },
            { label: "Flagged (24h)", value: stats.flagged_24h, accent: "amber" },
            { label: "Blocked (24h)", value: stats.blocked_24h, accent: "alert" },
            { label: "Open Incidents", value: stats.open_incidents, accent: "muted" },
          ]}
        />
      )}

      {error && (
        <div className="flex items-center justify-between rounded-lg border border-alert/40 bg-alert/10 px-4 py-3">
          <p className="text-sm text-alert">{error}</p>
          <button
            type="button"
            onClick={fetchData}
            className="flex items-center gap-1.5 rounded border border-line bg-panel px-3 py-1.5 text-xs text-text"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      )}

      {!loading && events.length === 0 ? (
        <EmptyState
          title="No queries yet"
          description={`DNS Shield is listening on ${endpoint}. Send DNS traffic to this endpoint or use the lab simulators in Settings.`}
          actionLabel="View integration snippet"
          actionHref="/#integration"
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-line">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-line bg-panel text-xs uppercase tracking-wider text-muted">
                <th className="w-8 px-3 py-2" />
                <th className="px-3 py-2 font-medium">Time</th>
                <th className="px-3 py-2 font-medium">Domain</th>
                <th className="px-3 py-2 font-medium">Risk</th>
                <th className="px-3 py-2 font-medium">Verdict</th>
                <th className="px-3 py-2 font-medium">Client IP</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => {
                const isOpen = expanded === event.id;
                return (
                  <Fragment key={event.id}>
                    <tr
                      key={event.id}
                      className={cn(
                        "border-b border-line bg-panel transition-colors duration-120 hover:bg-panel-raised",
                        rowHeight,
                      )}
                    >
                      <td className="px-3">
                        <button
                          type="button"
                          onClick={() => setExpanded(isOpen ? null : event.id)}
                          className="text-muted hover:text-text"
                          aria-label={isOpen ? "Collapse row" : "Expand row"}
                        >
                          {isOpen ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                      <td className="px-3 font-mono text-sm text-muted">
                        {formatTime(event.timestamp)}
                      </td>
                      <td className="px-3">
                        <Link href={`/app/domain/${event.id}`} className="hover:text-trace">
                          <DomainCell domain={event.domain} />
                        </Link>
                      </td>
                      <td className="px-3">
                        <RiskScore score={event.risk_score} />
                      </td>
                      <td className="px-3">
                        <VerdictBadge verdict={event.verdict} glow={false} />
                      </td>
                      <td className="px-3 font-mono text-sm text-muted">{event.client_ip}</td>
                    </tr>
                    {isOpen && (
                      <tr className="border-b border-line bg-panel-raised">
                        <td colSpan={6} className="px-4 py-4">
                          <PipelineCascade
                            pipeline={event.pipeline}
                            lexicalChars={event.lexical_chars}
                            animate={false}
                            compact
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
