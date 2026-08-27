"use client";
import { motion } from "framer-motion";
import { useInView } from "@/hooks/useInView";
import { Terminal, Braces } from "lucide-react";

export function IntegrationSection() {
  const { ref, inView } = useInView();

  const request = `POST /api/v1/query
Content-Type: application/json

{
  "domain": "suspicious-domain.xyz",
  "client_ip": "10.0.0.42"
}`;

  const response = `{
  "id": "evt_8f3a…",
  "domain": "suspicious-domain.xyz",
  "risk_score": 78,
  "verdict": "BLOCK",
  "pipeline": [
    { "stage": 1, "name": "Cache",       "contribution": 0,  "reason": "Cache miss" },
    { "stage": 2, "name": "Threat Intel","contribution": 0,  "reason": "No IOC match" },
    { "stage": 3, "name": "ML Lexical",  "contribution": 55, "decided": true,
      "reason": "High entropy DGA signature" }
    // … stages 4–7
  ]
}`;

  return (
    <section id="integration" ref={ref as React.RefObject<HTMLElement>} className="border-b border-line bg-white py-10 md:py-16">
      <div className="mx-auto max-w-[1120px] px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="mb-2 font-mono text-[11px] font-medium uppercase tracking-wider text-muted">
            Integration
          </p>
          <h2 className="font-display text-[28px] font-bold tracking-tight text-text md:text-[36px]">
            Point. Query. Trace.
          </h2>
          <p className="mt-2 text-sm text-muted">
            Point your resolver or SIEM at the query endpoint. Every response includes the full pipeline trace.
          </p>
        </motion.div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {[
            { icon: Terminal, label: "Request", code: request, delay: 0.1, border: "border-slate-200", bg: "bg-slate-900", textColor: "text-slate-100", labelColor: "text-slate-400" },
            { icon: Braces, label: "Response", code: response, delay: 0.2, border: "border-slate-200", bg: "bg-slate-900", textColor: "text-slate-100", labelColor: "text-slate-400" },
          ].map(({ icon: Icon, label, code, delay, bg, textColor, labelColor }) => (
            <motion.div
              key={label}
              className={`rounded-xl border border-slate-200 overflow-hidden shadow-sm`}
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -2, transition: { type: "spring", stiffness: 400, damping: 25 } }}
            >
              {/* Code block header */}
              <div className="flex items-center gap-2 border-b border-slate-700 bg-slate-800 px-4 py-2.5">
                <div className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                </div>
                <Icon className={`h-3.5 w-3.5 ml-2 ${labelColor}`} />
                <span className={`font-mono text-[11px] uppercase tracking-wider font-medium ${labelColor}`}>
                  {label}
                </span>
              </div>
              <div className={`${bg} px-4 py-4`}>
                <pre className={`overflow-x-auto font-mono text-xs leading-5 ${textColor}`}>{code}</pre>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
