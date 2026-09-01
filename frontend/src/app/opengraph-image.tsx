import { ImageResponse } from "next/og";

export const alt = "DNS Shield — Autonomous Explainable DNS Threat Defense & APT Forecasting";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "space-between",
          padding: "60px 80px",
          fontFamily: "sans-serif",
          color: "#ffffff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "16px",
              backgroundColor: "#2563eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 10px 25px -5px rgba(37, 99, 235, 0.5)",
            }}
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "36px", fontWeight: "bold", letterSpacing: "-0.5px" }}>
              DNS SHIELD
            </span>
            <span style={{ fontSize: "16px", color: "#60a5fa", fontWeight: 600, letterSpacing: "1.5px" }}>
              AUTONOMOUS THREAT DEFENSE PLATFORM
            </span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "950px" }}>
          <div
            style={{
              fontSize: "52px",
              fontWeight: "bold",
              lineHeight: 1.15,
              letterSpacing: "-1px",
              color: "#f8fafc",
            }}
          >
            Explainable DNS Threat Defense & Multi-Stage APT Forecasting
          </div>
          <div
            style={{
              fontSize: "24px",
              color: "#94a3b8",
              lineHeight: 1.4,
            }}
          >
            Intercept malicious queries, forecast kill-chain progression across 15–60 minute horizons, and automate preemptive isolation with full SHAP transparency.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "30px", borderTop: "1px solid #334155", paddingTop: "30px", width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#10b981" }} />
            <span style={{ fontSize: "18px", color: "#cbd5e1" }}>7-Stage Deep Inspection</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#3b82f6" }} />
            <span style={{ fontSize: "18px", color: "#cbd5e1" }}>Temporal GRU Kill-Chain Rollout</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#f59e0b" }} />
            <span style={{ fontSize: "18px", color: "#cbd5e1" }}>SHAP & LIME Interpretability</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
