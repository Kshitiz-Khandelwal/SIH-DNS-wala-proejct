const layers = [
  {
    title: "Threat Intel Feeds",
    body: "STIX/TAXII and URLhaus indicators matched in Stage 2. Known malware hosts block immediately with feed provenance in the trace.",
  },
  {
    title: "ML Lexical Analysis",
    body: "Char n-grams plus engineered features — entropy, digit ratio, vowel ratio, longest consonant run — score domain strings for DGA and typosquat signatures.",
  },
  {
    title: "Behavioral Engine",
    body: "Per-client query patterns detect DNS tunnelling and C2 beaconing: burst entropy, random subdomain volume, and resolver geo anomalies.",
  },
];

export function HowItWorks() {
  return (
    <section className="border-b border-line py-14 md:py-24">
      <div className="mx-auto max-w-[1120px] px-6">
        <h2 className="font-display text-[32px] font-semibold leading-[38px] tracking-tight text-text">
          How it works
        </h2>
        <p className="mt-3 max-w-2xl text-muted">
          Three real layers, named plainly — no black-box scoring.
        </p>
        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {layers.map((layer) => (
            <div key={layer.title}>
              <h3 className="font-display text-lg font-semibold text-text">{layer.title}</h3>
              <p className="mt-2 text-sm leading-5 text-muted">{layer.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
