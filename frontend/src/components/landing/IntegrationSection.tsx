export function IntegrationSection() {
  const request = `POST /v1/query
Content-Type: application/json

{
  "domain": "suspicious-domain.xyz",
  "client_ip": "10.0.0.42"
}`;

  const response = `{
  "id": "evt_8f3a…",
  "domain": "suspicious-domain.xyz",
  "client_ip": "10.0.0.42",
  "risk_score": 78,
  "verdict": "BLOCK",
  "pipeline": [
    { "stage": 1, "name": "Cache", "contribution": 0, "reason": "Cache miss" },
    { "stage": 2, "name": "Threat Intel", "contribution": 0, "reason": "No IOC match" },
    { "stage": 3, "name": "ML Lexical", "contribution": 55,
      "reason": "High entropy DGA signature", "decided": true }
    // … stages 4–7
  ]
}`;

  return (
    <section id="integration" className="border-b border-line py-14 md:py-24">
      <div className="mx-auto max-w-[1120px] px-6">
        <h2 className="font-display text-[32px] font-semibold leading-[38px] tracking-tight text-text">
          Integration
        </h2>
        <p className="mt-3 text-sm text-muted">
          Point your resolver or SIEM at the query endpoint. Every response includes the full pipeline trace.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-line bg-panel p-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">Request</p>
            <pre className="overflow-x-auto font-mono text-xs leading-5 text-text">{request}</pre>
          </div>
          <div className="rounded-lg border border-line bg-panel p-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">Response</p>
            <pre className="overflow-x-auto font-mono text-xs leading-5 text-text">{response}</pre>
          </div>
        </div>
      </div>
    </section>
  );
}
