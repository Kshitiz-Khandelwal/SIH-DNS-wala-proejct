import React from "react";
import Link from "next/link";
import { ArrowRight, ChevronRight, Globe, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { VerdictBadge } from "@/components/VerdictBadge";
import { DomainCell } from "@/components/DomainCell";
import { formatTime } from "@/lib/utils";
import type { QueryResult } from "@/lib/types";
import { cn } from "@/lib/utils";

interface LiveQueryTableProps {
  events: QueryResult[];
  totalCount: number;
  filter: "ALL" | "BLOCK" | "FLAG" | "ALLOW";
  searchQuery: string;
  onFilterChange: (f: "ALL" | "BLOCK" | "FLAG" | "ALLOW") => void;
  onSearchChange: (q: string) => void;
}

export function LiveQueryTable({
  events,
  totalCount,
  filter,
  searchQuery,
  onFilterChange,
  onSearchChange,
}: LiveQueryTableProps) {
  return (
    <Card className="overflow-hidden">
      {/* Table Header & Controls */}
      <div className="flex flex-col gap-4 border-b border-slate-200/80 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Live Query & Threat Stream</h2>
          <p className="text-xs text-slate-500 mt-0.5">Inspecting incoming requests from recursive resolvers</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search Input with 4px grid spacing */}
          <div className="relative min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search domain or IP..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50/70 pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-100 transition"
            />
          </div>

          {/* Filter Tabs */}
          <TabsList>
            {(["ALL", "BLOCK", "FLAG", "ALLOW"] as const).map((tab) => (
              <TabsTrigger
                key={tab}
                active={filter === tab}
                onClick={() => onFilterChange(tab)}
              >
                {tab}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </div>

      {/* Table Body */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[110px]">Timestamp</TableHead>
            <TableHead>Queried Domain</TableHead>
            <TableHead className="w-[120px]">Client IP</TableHead>
            <TableHead className="w-[140px]">Risk Score</TableHead>
            <TableHead className="w-[100px]">Verdict</TableHead>
            <TableHead className="w-[80px] text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-32 text-center text-xs text-slate-400">
                No queries found matching the selected criteria.
              </TableCell>
            </TableRow>
          ) : (
            events.map((ev) => {
              const clamped = Math.min(100, Math.max(0, ev.risk_score));
              const indicatorColor =
                clamped <= 35
                  ? "bg-emerald-500"
                  : clamped <= 70
                    ? "bg-amber-500"
                    : "bg-rose-500";

              return (
                <TableRow key={ev.id} className="h-12">
                  <TableCell className="font-mono text-xs text-slate-500 whitespace-nowrap">
                    {formatTime(ev.timestamp)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Globe className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <DomainCell domain={ev.domain} maxWidth={230} />
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-slate-600">
                    {ev.client_ip}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <Progress
                        value={clamped}
                        className="h-1.5 w-16"
                        indicatorClassName={indicatorColor}
                      />
                      <span className="font-mono text-xs font-semibold text-slate-700">
                        {clamped}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <VerdictBadge verdict={ev.verdict} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/app/domain?d=${encodeURIComponent(ev.domain)}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      Inspect
                      <ChevronRight className="h-3 w-3" />
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      {/* Table Footer */}
      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 p-4 text-xs">
        <span className="text-slate-500 font-medium">
          Showing <strong className="text-slate-800">{events.length}</strong> of {totalCount} total queries
        </span>
        <Link
          href="/app/queue"
          className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-800"
        >
          Open Full Query Queue <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </Card>
  );
}
