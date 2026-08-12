"use client";

import { useEffect, useState } from "react";
import { getFeedHealth, getModelMetadata } from "@/lib/api";
import type { FeedHealth, ModelMetadata } from "@/lib/types";
import { formatDateTime, truncateHash } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/EmptyState";

function HealthDot({ status }: { status: FeedHealth["status"] }) {
  const colors = {
    healthy: "bg-trace",
    degraded: "bg-signal-amber",
    failed: "bg-alert",
  };
  return <span className={cn("inline-block h-2 w-2 rounded-full", colors[status])} />;
}

export default function ModelsPage() {
  const [model, setModel] = useState<ModelMetadata | null>(null);
  const [feeds, setFeeds] = useState<FeedHealth[]>([]);

  useEffect(() => {
    Promise.all([getModelMetadata(), getFeedHealth()])
      .then(([m, f]) => {
        setModel(m);
        setFeeds(f);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text">Models & Feeds</h1>
        <p className="mt-1 text-sm text-muted">Training provenance and threat feed health.</p>
      </div>

      {model && (
        <section className="rounded-lg border border-line bg-panel p-5">
          <h2 className="font-display text-lg font-semibold text-text">
            Deployed model — {model.version}
          </h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted">Trained</dt>
              <dd className="font-mono text-text">{formatDateTime(model.trained_date)}</dd>
            </div>
            <div>
              <dt className="text-muted">Dataset source</dt>
              <dd className="text-text">{model.dataset_source}</dd>
            </div>
            <div>
              <dt className="text-muted">Dataset SHA-256</dt>
              <dd className="font-mono text-text" title={model.dataset_sha256}>
                {truncateHash(model.dataset_sha256)}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Split strategy</dt>
              <dd className="text-text">{model.split_strategy}</dd>
            </div>
            <div>
              <dt className="text-muted">Weighted F1</dt>
              <dd className="font-mono text-trace">{model.weighted_f1.toFixed(3)}</dd>
            </div>
            <div>
              <dt className="text-muted">Holdout size</dt>
              <dd className="font-mono text-text">{model.holdout_size.toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-muted">Hyperparameter tuning</dt>
              <dd className="text-text">{model.hyperparameter_tuning ? "Yes" : "No"}</dd>
            </div>
          </dl>
        </section>
      )}

      <section>
        <h2 className="font-display text-lg font-semibold text-text">Threat feed status</h2>
        {feeds.length === 0 ? (
          <EmptyState
            title="No feeds configured"
            description="Connect URLhaus, STIX/TAXII, or CERT-In feeds to enable Stage 2 threat intel matching."
            className="mt-4"
          />
        ) : (
          <div className="mt-4 space-y-3">
            {feeds.map((feed) => (
              <div
                key={feed.name}
                className="flex flex-col gap-2 rounded-lg border border-line bg-panel p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <HealthDot status={feed.status} />
                  <div>
                    <p className="font-display text-sm font-semibold text-text">{feed.name}</p>
                    {feed.error && (
                      <p className="mt-0.5 text-xs text-alert">{feed.error}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-6 text-xs text-muted">
                  <span>
                    <span className="font-mono text-text">
                      {feed.indicator_count.toLocaleString()}
                    </span>{" "}
                    indicators
                  </span>
                  <span>Last sync: {formatDateTime(feed.last_sync)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
