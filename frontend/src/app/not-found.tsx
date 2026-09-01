import Link from "next/link";
import { ShieldAlert, ArrowLeft, LayoutDashboard, Radio } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-slate-50 px-4 text-slate-900 antialiased relative overflow-hidden">
      {/* Background glow accents */}
      <div className="absolute top-1/4 left-1/3 h-96 w-96 rounded-full bg-blue-100/60 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 h-96 w-96 rounded-full bg-rose-100/50 blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-lg w-full text-center rounded-2xl border border-slate-200 bg-white p-8 md:p-10 shadow-xl">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 shadow-sm">
          <ShieldAlert className="h-8 w-8" />
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-mono text-slate-600 mb-4 tracking-wider uppercase">
          HTTP 404 · Unresolved Telemetry Node
        </div>

        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 font-sans">
          Security Route Not Found
        </h1>

        <p className="mt-3 text-sm text-slate-600 leading-relaxed">
          The requested endpoint or security view does not exist in the DNS Shield active routing matrix. It may have been relocated or requires elevated operational credentials.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/app/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            <LayoutDashboard className="h-4 w-4" />
            SOC Dashboard
          </Link>

          <Link
            href="/app/forecast"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200 hover:text-slate-900 transition-colors"
          >
            <Radio className="h-4 w-4" />
            Attack Forecast
          </Link>

          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-transparent px-4 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </div>

        <div className="mt-8 border-t border-slate-100 pt-4 text-[11px] font-mono text-slate-400">
          DNS Shield Autonomous Threat Defense System · SIH 2026
        </div>
      </div>
    </div>
  );
}
