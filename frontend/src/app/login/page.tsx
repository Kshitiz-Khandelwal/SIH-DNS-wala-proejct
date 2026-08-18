"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, ArrowRight, Lock } from "lucide-react";
import { login } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [operatorId, setOperatorId] = useState("analyst");
  const [passphrase, setPassphrase] = useState("demo123");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!operatorId.trim() || !passphrase.trim()) {
      setError("Please provide an Operator ID and Passphrase.");
      return;
    }
    const success = login(operatorId, passphrase);
    if (success) {
      router.push("/app/dashboard");
    } else {
      setError("Invalid credentials.");
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 relative overflow-hidden px-4">
      {/* Soft background accents */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-100/50 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-indigo-100/40 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg z-10">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md">
              <Shield className="w-6 h-6" />
            </div>
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
            DNS SHIELD
          </h1>
          <p className="text-xs font-semibold text-blue-700 tracking-wider uppercase mt-1">
            AI Threat Defense Console
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700 font-medium text-center">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Operator ID
            </label>
            <input
              type="text"
              value={operatorId}
              onChange={(e) => setOperatorId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              placeholder="e.g. analyst"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Passphrase
            </label>
            <input
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-blue-700 mt-6"
          >
            Access Security Console
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <div className="mt-6 border-t border-slate-100 pt-4 text-center text-[11px] text-slate-400">
          SIH 2024 Â· Explainable DNS Threat Defense System
        </div>
      </div>
    </div>
  );
}
