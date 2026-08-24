"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { AppSidebar } from "@/components/console/AppSidebar";
import { AppHeader } from "@/components/console/AppHeader";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
    } else {
      setReady(true);
    }
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-xs font-mono text-slate-400 bg-[#070a12]">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
          <span>AUTHENTICATING SOVEREIGN NODE...</span>
        </div>
      </div>
    );
  }

  const isFlush = pathname === "/app/pipeline";

  return (
    <div className="flex h-screen overflow-hidden bg-[#070a12] dot-grid text-slate-100 font-sans">
      <AppSidebar />
      <div className="flex flex-1 flex-col h-screen overflow-hidden min-w-0">
        <AppHeader />
        <main className={isFlush ? "flex-1 overflow-hidden" : "flex-1 overflow-y-auto p-6 md:p-8 pb-12"}>
          {children}
        </main>
      </div>
    </div>
  );
}
