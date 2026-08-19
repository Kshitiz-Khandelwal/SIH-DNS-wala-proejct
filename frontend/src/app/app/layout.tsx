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
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500 font-medium bg-slate-50">
        Loading console…
      </div>
    );
  }

  // Pipeline page manages its own full-height layout
  const isFlush = pathname === "/app/pipeline";

  return (
    /* Stitch: ml-[240px] offset for fixed sidebar, min-h-screen, dot-grid background */
    <div className="flex min-h-screen bg-slate-50 dot-grid">
      <AppSidebar />
      {/* Main area offset by fixed sidebar width */}
      <div className="flex flex-1 flex-col min-h-screen md:ml-[240px]">
        <AppHeader />
        <main className={isFlush ? "flex-1 overflow-hidden" : "flex-1 overflow-y-auto p-6 md:p-8 pb-12"}>
          {children}
        </main>
      </div>
    </div>
  );
}
