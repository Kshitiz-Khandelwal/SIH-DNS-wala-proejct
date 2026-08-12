"use client";

import { useEffect, useState } from "react";
import { getModelMetadata, getStats } from "@/lib/api";
import type { ModelMetadata, StatsResponse } from "@/lib/types";
import { KPIStrip } from "@/components/KPIStrip";

export function LiveMetrics() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [model, setModel] = useState<ModelMetadata | null>(null);

  useEffect(() => {
    Promise.all([getStats(), getModelMetadata()])
      .then(([s, m]) => {
        setStats(s);
        setModel(m);
      })
      .catch(() => {});
  }, []);

  if (!stats || !model) return null;

  return (
    <section className="border-b border-line py-14 md:py-24">
      <div className="mx-auto max-w-[1120px] px-6">
        <h2 className="font-display text-[32px] font-semibold leading-[38px] tracking-tight text-text">
          Live metrics
        </h2>
        <p className="mt-3 text-sm text-muted">Measured, not claimed.</p>
        <div className="mt-8">
          <KPIStrip
            items={[
              { label: "Allowed (24h)", value: stats.allowed_24h, accent: "trace" },
              { label: "Flagged (24h)", value: stats.flagged_24h, accent: "amber" },
              { label: "Blocked (24h)", value: stats.blocked_24h, accent: "alert" },
              {
                label: "Weighted F1",
                value: model.weighted_f1.toFixed(3),
                sublabel: `Holdout n=${model.holdout_size.toLocaleString()}`,
                accent: "muted",
              },
            ]}
          />
        </div>
      </div>
    </section>
  );
}
