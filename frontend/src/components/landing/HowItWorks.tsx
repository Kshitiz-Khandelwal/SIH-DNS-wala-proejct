"use client";
import { motion, type Variants } from "framer-motion";
import { useInView } from "@/hooks/useInView";
import { ShieldCheck, BrainCircuit, Activity } from "lucide-react";

const layers = [
  {
    icon: ShieldCheck,
    title: "Threat Intel Feeds",
    body: "STIX/TAXII and URLhaus indicators matched in Stage 2. Known malware hosts block immediately with feed provenance in the trace.",
    accent: "text-trace",
    bg: "bg-emerald-50",
    border: "border-emerald-100",
  },
  {
    icon: BrainCircuit,
    title: "ML Lexical Analysis",
    body: "Char n-grams plus engineered features — entropy, digit ratio, vowel ratio, longest consonant run — score domain strings for DGA and typosquat signatures.",
    accent: "text-violet-600",
    bg: "bg-violet-50",
    border: "border-violet-100",
  },
  {
    icon: Activity,
    title: "Behavioral Engine",
    body: "Per-client query patterns detect DNS tunnelling and C2 beaconing: burst entropy, random subdomain volume, and resolver geo anomalies.",
    accent: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-100",
  },
];

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const card: Variants = {
  hidden: { opacity: 0, y: 28 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export function HowItWorks() {
  const { ref, inView } = useInView();

  return (
    <section ref={ref as React.RefObject<HTMLElement>} className="border-b border-line bg-slate-50 py-10 md:py-16">
      <div className="mx-auto max-w-[1120px] px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="mb-2 font-mono text-[11px] font-medium uppercase tracking-wider text-muted">
            How it works
          </p>
          <h2 className="font-display text-[28px] font-bold leading-tight tracking-tight text-text md:text-[36px]">
            Three real layers.{" "}
            <span className="text-muted font-normal">No black-box scoring.</span>
          </h2>
        </motion.div>

        <motion.div
          className="mt-10 grid gap-6 md:grid-cols-3"
          variants={container}
          initial="hidden"
          animate={inView ? "show" : "hidden"}
        >
          {layers.map((layer) => {
            const Icon = layer.icon;
            return (
              <motion.div
                key={layer.title}
                variants={card}
                whileHover={{ y: -4, transition: { type: "spring", stiffness: 400, damping: 20 } }}
                className={`rounded-xl border ${layer.border} ${layer.bg} p-6`}
              >
                <div className={`mb-3 inline-flex rounded-lg p-2 ${layer.bg}`}>
                  <Icon className={`h-5 w-5 ${layer.accent}`} />
                </div>
                <h3 className={`font-display text-base font-semibold ${layer.accent}`}>
                  {layer.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted">{layer.body}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
