import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "danger" | "info";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variantStyles = {
    default: "border-transparent bg-slate-900 text-white shadow-xs",
    secondary: "border-transparent bg-slate-100 text-slate-900",
    destructive: "border-transparent bg-rose-500 text-white shadow-xs",
    outline: "border-slate-200 text-slate-900",
    success: "border-emerald-200/80 bg-emerald-50 text-emerald-700",
    warning: "border-amber-200/80 bg-amber-50 text-amber-800",
    danger: "border-rose-200/80 bg-rose-50 text-rose-700",
    info: "border-blue-200/80 bg-blue-50 text-blue-700",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-hidden",
        variantStyles[variant],
        className,
      )}
      {...props}
    />
  );
}

export { Badge };
