"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (login(username, password)) {
      router.push("/app/queue");
    } else {
      setError("Enter your credentials to continue.");
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="font-display text-xl font-bold tracking-tight text-text">
          DNS SHIELD
        </Link>
        <h1 className="mt-8 font-display text-2xl font-semibold text-text">SOC Console</h1>
        <p className="mt-2 text-sm text-muted">Sign in to access the analyst dashboard.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="username" className="block text-xs font-medium text-muted">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 w-full rounded border border-line bg-panel px-3 py-2 text-sm text-text"
              autoComplete="username"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-xs font-medium text-muted">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded border border-line bg-panel px-3 py-2 text-sm text-text"
              autoComplete="current-password"
            />
          </div>
          {error && <p className="text-sm text-alert">{error}</p>}
          <button
            type="submit"
            className="w-full rounded-lg bg-trace py-2.5 text-sm font-medium text-ink transition-opacity duration-120 hover:opacity-90"
          >
            Sign in
          </button>
        </form>
        <Link href="/" className="mt-6 block text-center text-sm text-muted hover:text-text">
          ← Back to landing
        </Link>
      </div>
    </div>
  );
}
