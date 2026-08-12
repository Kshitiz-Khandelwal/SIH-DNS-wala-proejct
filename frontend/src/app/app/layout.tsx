"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { ConsoleNav, StatusStrip } from "@/components/console/ConsoleNav";

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
      <div className="flex min-h-screen items-center justify-center text-sm text-muted">
        Loading console…
      </div>
    );
  }

  // Pipeline page manages its own full-height layout
  const isFlush = pathname === "/app/pipeline";

  return (
    <div className="flex h-screen overflow-hidden">
      <ConsoleNav />
      <div className="flex flex-1 flex-col overflow-hidden">
        <StatusStrip />
        <main className={isFlush ? "flex-1 overflow-hidden" : "flex-1 overflow-auto p-5"}>
          {children}
        </main>
      </div>
    </div>
  );
}
