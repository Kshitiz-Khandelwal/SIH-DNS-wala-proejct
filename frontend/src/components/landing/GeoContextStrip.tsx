"use client";

import React, { useState } from "react";
import { Globe, MapPin, Building, ShieldCheck, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface GeoMarker {
  id: string;
  ip: string;
  domain: string;
  city: string;
  country: string;
  asn: string;
  asnOrg: string;
  x: number; // percentage on SVG
  y: number; // percentage on SVG
  isSovereign: boolean;
  status: "safe" | "flagged" | "blocked";
}

const SAMPLE_MARKERS: GeoMarker[] = [
  {
    id: "delhi-nic",
    ip: "164.100.158.23",
    domain: "isro.gov.in",
    city: "New Delhi",
    country: "India",
    asn: "AS55824",
    asnOrg: "National Informatics Centre (NIC)",
    x: 70,
    y: 44,
    isSovereign: true,
    status: "safe"
  },
  {
    id: "us-c2",
    ip: "104.21.55.2",
    domain: "xq9m2kz7v4naplq.top",
    city: "San Jose",
    country: "United States",
    asn: "AS13335",
    asnOrg: "Cloudflare Anycast Proxy",
    x: 22,
    y: 38,
    isSovereign: false,
    status: "blocked"
  },
  {
    id: "eu-tunnel",
    ip: "185.220.101.5",
    domain: "attacker-c2.net",
    city: "Frankfurt",
    country: "Germany",
    asn: "AS200052",
    asnOrg: "Offshore VPS Hosting",
    x: 52,
    y: 30,
    isSovereign: false,
    status: "flagged"
  }
];

export function GeoContextStrip({ className }: { className?: string }) {
  const [selectedMarkerId, setSelectedMarkerId] = useState<string>("delhi-nic");

  const selected = SAMPLE_MARKERS.find((m) => m.id === selectedMarkerId) || SAMPLE_MARKERS[0];

  return (
    <div className={cn("rounded-2xl border border-slate-200 bg-white p-6 shadow-sm", className)}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-emerald-600" />
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-slate-400">Stage 6 Enrichment</span>
            <span className="rounded-full bg-slate-100 text-slate-700 px-2 py-0.5 font-mono text-[10px] font-bold border border-slate-200">GeoIP & Autonomous System</span>
          </div>
          <h3 className="text-lg font-bold text-slate-900 mt-1">Autonomous System (ASN) & Sovereign Geo Intelligence</h3>
          <p className="text-xs text-slate-500 mt-0.5">Instant sub-millisecond local MaxMind GeoLite2 lookup identifies routing jurisdiction and hosting reputation.</p>
        </div>

        {/* Marker Switchers */}
        <div className="flex flex-wrap gap-1.5">
          {SAMPLE_MARKERS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setSelectedMarkerId(m.id)}
              className={cn(
                "rounded-lg px-2.5 py-1 font-mono text-xs transition-colors cursor-pointer border",
                selected.id === m.id
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              )}
            >
              {m.city} ({m.country})
            </button>
          ))}
        </div>
      </div>

      {/* Flat World Map Container */}
      <div className="relative my-6 rounded-xl border border-slate-200 bg-slate-50/50 p-4 overflow-hidden">
        {/* SVG World Map Simplified Outlines */}
        <div className="relative h-48 w-full">
          <svg className="h-full w-full opacity-30 text-slate-400" viewBox="0 0 1000 500" fill="currentColor">
            {/* North America */}
            <path d="M150,120 Q200,80 300,100 Q280,180 230,220 Q180,260 160,200 Z" />
            {/* South America */}
            <path d="M280,260 Q340,280 320,380 Q280,450 260,380 Q250,300 280,260 Z" />
            {/* Europe */}
            <path d="M480,100 Q560,90 550,160 Q500,180 470,140 Z" />
            {/* Africa */}
            <path d="M480,190 Q560,190 570,300 Q520,380 480,300 Q450,230 480,190 Z" />
            {/* Asia & India */}
            <path d="M600,80 Q850,90 820,240 Q720,260 680,210 Q660,180 600,160 Z" />
            <path d="M680,210 Q720,220 700,280 Q670,250 680,210 Z" /> {/* India subcontinent */}
            {/* Australia */}
            <path d="M780,320 Q860,330 840,400 Q770,390 780,320 Z" />
          </svg>

          {/* Interactive Geo Markers */}
          {SAMPLE_MARKERS.map((m) => {
            const isSelected = m.id === selectedMarkerId;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedMarkerId(m.id)}
                style={{ left: `${m.x}%`, top: `${m.y}%` }}
                className={cn(
                  "absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center rounded-full transition-all cursor-pointer",
                  isSelected ? "h-7 w-7 ring-4 ring-emerald-500/20" : "h-5 w-5",
                  m.status === "blocked" ? "bg-rose-500 text-white" :
                  m.status === "flagged" ? "bg-amber-500 text-white" :
                  "bg-emerald-500 text-white"
                )}
                title={`${m.city}, ${m.country} — ${m.asnOrg}`}
              >
                <MapPin className={cn(isSelected ? "h-4 w-4" : "h-3 w-3")} />
              </button>
            );
          })}
        </div>

        {/* Selected Marker Detail Card */}
        <div className="mt-4 rounded-xl bg-white border border-slate-200 p-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-slate-600" />
              <span className="font-mono text-sm font-bold text-slate-900">{selected.asnOrg}</span>
              <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-700 border border-slate-200">{selected.asn}</span>
            </div>
            <div className="flex items-center gap-2">
              {selected.isSovereign && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 font-mono text-xs font-bold text-emerald-700 border border-emerald-200">
                  <ShieldCheck className="h-3.5 w-3.5" /> Sovereign Indian Asset
                </span>
              )}
              <span className="font-mono text-xs text-slate-500">IP: <strong>{selected.ip}</strong></span>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 font-mono text-xs">
            <div>
              <span className="text-[10px] uppercase text-slate-400 block">Jurisdiction</span>
              <span className="font-semibold text-slate-800">{selected.city}, {selected.country}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-slate-400 block">Routing Target</span>
              <span className="font-semibold text-slate-800 truncate block">{selected.domain}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-slate-400 block">Inspection Status</span>
              <span className={cn("font-bold uppercase", selected.status === "blocked" ? "text-rose-600" : selected.status === "flagged" ? "text-amber-600" : "text-emerald-600")}>
                {selected.status}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-slate-400 block">Lookup Latency</span>
              <span className="font-semibold text-slate-800">0.09 ms (Local DB)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
