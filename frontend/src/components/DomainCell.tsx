"use client";

import { cn } from "@/lib/utils";

export function DomainCell({
  domain,
  className,
  maxWidth = 280,
}: {
  domain: string;
  className?: string;
  maxWidth?: number;
}) {
  return (
    <span
      className={cn(
        "inline-block truncate font-mono text-sm text-text",
        className,
      )}
      style={{ maxWidth }}
      title={domain}
    >
      {domain}
    </span>
  );
}
