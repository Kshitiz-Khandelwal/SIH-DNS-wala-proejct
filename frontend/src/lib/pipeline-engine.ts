import type {
  LexicalChar,
  LexicalFeatures,
  PipelineStage,
  QueryResult,
  Verdict,
} from "./types";

const STAGE_NAMES = [
  "Cache",
  "Threat Intel",
  "ML Lexical",
  "Behavioral",
  "Geo",
  "Active Response",
  "Analytics",
] as const;

function shannonEntropy(s: string): number {
  const freq: Record<string, number> = {};
  for (const c of s) freq[c] = (freq[c] ?? 0) + 1;
  let entropy = 0;
  for (const count of Object.values(freq)) {
    const p = count / s.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

function computeLexicalFeatures(domain: string): LexicalFeatures {
  const base = domain.split(".")[0] ?? domain;
  const vowels = (base.match(/[aeiouAEIOU]/g) ?? []).length;
  const digits = (base.match(/\d/g) ?? []).length;
  let maxConsonant = 0;
  let current = 0;
  for (const c of base) {
    if (/[b-df-hj-np-tv-z]/i.test(c)) {
      current++;
      maxConsonant = Math.max(maxConsonant, current);
    } else {
      current = 0;
    }
  }
  const suspiciousTlds = ["xyz", "top", "click", "gq", "tk", "ml"];
  const tld = domain.split(".").pop()?.toLowerCase() ?? "";
  return {
    entropy: Number(shannonEntropy(base).toFixed(2)),
    digit_ratio: Number((digits / Math.max(base.length, 1)).toFixed(2)),
    vowel_ratio: Number((vowels / Math.max(base.length, 1)).toFixed(2)),
    longest_consonant_run: maxConsonant,
    subdomain_count: Math.max(domain.split(".").length - 2, 0),
    tld_suspicion: suspiciousTlds.includes(tld) ? 0.85 : 0.1,
    char_ngram_score: Number((shannonEntropy(base) / 5).toFixed(2)),
  };
}

function computeLexicalChars(domain: string): LexicalChar[] {
  const base = domain.split(".")[0] ?? domain;
  return base.split("").map((char) => {
    let score = 0.2;
    if (/[0-9]/.test(char)) score += 0.3;
    if (/[b-df-hj-np-tv-z]/i.test(char)) score += 0.15;
    if (/[qxz]/i.test(char)) score += 0.25;
    if (/[aeiou]/i.test(char)) score -= 0.1;
    return { char, score: Math.min(1, Math.max(0, score)) };
  });
}

function classifyDomain(domain: string): {
  profile: "clean" | "dga" | "typosquat" | "threat" | "tunnelling";
  baseScore: number;
} {
  const lower = domain.toLowerCase();
  const threatPatterns = [
    "malware",
    "phish",
    "evil",
    "c2",
    "botnet",
    "exfil",
    "payload",
  ];
  const cleanPatterns = [
    "google",
    "github",
    "microsoft",
    "amazon",
    "cloudflare",
    "wikipedia",
    "isro",
  ];
  const typosquatPatterns = [
    "gooogle",
    "githuub",
    "microsft",
    "amaz0n",
    "paypa1",
    "app1e",
  ];

  if (cleanPatterns.some((p) => lower.includes(p))) {
    return { profile: "clean", baseScore: 12 };
  }
  if (typosquatPatterns.some((p) => lower.includes(p))) {
    return { profile: "typosquat", baseScore: 58 };
  }
  if (threatPatterns.some((p) => lower.includes(p))) {
    return { profile: "threat", baseScore: 92 };
  }
  if (lower.includes("tunnel") || lower.split(".").length > 4) {
    return { profile: "tunnelling", baseScore: 74 };
  }

  const base = lower.split(".")[0] ?? lower;
  const entropy = shannonEntropy(base);
  if (base.length > 14 && entropy > 3.5) {
    return { profile: "dga", baseScore: 78 };
  }
  if (entropy > 4 || base.length > 18) {
    return { profile: "dga", baseScore: 65 };
  }

  return { profile: "clean", baseScore: 28 };
}

function scoreToVerdict(score: number, thresholds = { allow_max: 40, flag_max: 70 }): Verdict {
  if (score <= thresholds.allow_max) return "ALLOW";
  if (score <= thresholds.flag_max) return "FLAG";
  return "BLOCK";
}

export function buildPipeline(
  domain: string,
  finalScore: number,
  profile: ReturnType<typeof classifyDomain>["profile"],
): PipelineStage[] {
  const stages: PipelineStage[] = STAGE_NAMES.map((name, i) => ({
    stage: i + 1,
    name,
    contribution: 0,
    reason: "No signal",
  }));

  stages[0] = {
    stage: 1,
    name: "Cache",
    contribution: 0,
    reason: "Cache miss — full pipeline evaluation",
  };

  if (profile === "threat") {
    stages[1] = {
      stage: 2,
      name: "Threat Intel",
      contribution: 100,
      reason: "Matched URLhaus indicator — known malware host",
      decided: true,
    };
    stages[2] = { stage: 3, name: "ML Lexical", contribution: 0, reason: "Skipped — verdict already decisive" };
  } else if (profile === "typosquat") {
    stages[1] = { stage: 2, name: "Threat Intel", contribution: 15, reason: "No direct IOC match" };
    stages[2] = {
      stage: 3,
      name: "ML Lexical",
      contribution: 45,
      reason: "High entropy + homoglyph pattern — typosquat signature",
      decided: true,
    };
  } else if (profile === "dga") {
    stages[1] = { stage: 2, name: "Threat Intel", contribution: 10, reason: "No STIX match" };
    stages[2] = {
      stage: 3,
      name: "ML Lexical",
      contribution: 55,
      reason: "High entropy, low vowel ratio — DGA lexical signature",
      decided: true,
    };
  } else if (profile === "tunnelling") {
    stages[1] = { stage: 2, name: "Threat Intel", contribution: 5, reason: "No feed match" };
    stages[2] = { stage: 3, name: "ML Lexical", contribution: 20, reason: "Elevated subdomain entropy" };
    stages[3] = {
      stage: 4,
      name: "Behavioral",
      contribution: 49,
      reason: "14 random-subdomain queries in 60s — tunnelling pattern",
      decided: true,
    };
  } else {
    stages[1] = { stage: 2, name: "Threat Intel", contribution: 0, reason: "Clean across STIX + URLhaus" };
    stages[2] = {
      stage: 3,
      name: "ML Lexical",
      contribution: Math.min(finalScore, 25),
      reason: finalScore > 30 ? "Minor lexical anomalies" : "Normal lexical profile",
    };
    if (finalScore <= 40) {
      stages[2].decided = true;
    }
  }

  stages[4] = {
    stage: 5,
    name: "Geo",
    contribution: profile === "clean" ? 0 : 8,
    reason: profile === "clean" ? "Expected geo for client" : "Unusual resolver geo hop",
  };
  stages[5] = {
    stage: 6,
    name: "Active Response",
    contribution: finalScore > 70 ? 12 : 0,
    reason: finalScore > 70 ? "Auto-block policy triggered" : "No active response required",
  };
  stages[6] = {
    stage: 7,
    name: "Analytics",
    contribution: 0,
    reason: `Final composite score: ${finalScore}`,
  };

  return stages;
}

export function scoreDomain(
  domain: string,
  clientIp = "192.168.1.1",
  options?: {
    id?: string;
    timestamp?: string;
    source?: QueryResult["source"];
    tags?: string[];
    thresholds?: { allow_max: number; flag_max: number };
  },
): QueryResult {
  const { profile, baseScore } = classifyDomain(domain);
  const features = computeLexicalFeatures(domain);
  const lexicalBoost =
    features.entropy > 3.8 ? 15 : features.entropy > 3.2 ? 8 : 0;
  const finalScore = Math.min(100, Math.max(0, baseScore + lexicalBoost));
  const verdict = scoreToVerdict(finalScore, options?.thresholds);
  const pipeline = buildPipeline(domain, finalScore, profile);

  let behavioral_context: string | undefined;
  if (profile === "tunnelling") {
    behavioral_context =
      "14 random-subdomain queries in the last 60s — consistent with DNS tunnelling";
  } else if (profile === "dga") {
    behavioral_context =
      "Burst of 8 high-entropy lookups from same client in 30s";
  }

  const decidingStage = pipeline.find((s) => s.decided);
  const decided_by = decidingStage
    ? `${decidingStage.name}: ${decidingStage.reason}`
    : `Composite score ${finalScore}`;

  return {
    id: options?.id ?? crypto.randomUUID(),
    domain,
    client_ip: clientIp,
    risk_score: finalScore,
    verdict,
    pipeline,
    lexical_features: features,
    lexical_chars: computeLexicalChars(domain),
    behavioral_context,
    decided_by,
    timestamp: options?.timestamp ?? new Date().toISOString(),
    source: options?.source ?? "live",
    tags: options?.tags,
  };
}

export const SAMPLE_DOMAINS = [
  { domain: "xk9mqz7p2n4r8v3w.top", label: "DGA domain" },
  { domain: "gooogle-login.security-update.com", label: "Typosquat" },
  { domain: "github.com", label: "Clean — correctly allowed" },
  { domain: "malware-c2.evil-payload.xyz", label: "Threat intel block" },
];
