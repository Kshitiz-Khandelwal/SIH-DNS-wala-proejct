import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://dns-shield.security"),
  title: {
    default: "DNS Shield — Explainable DNS Threat Defense & APT Forecasting",
    template: "%s | DNS Shield",
  },
  description:
    "Enterprise-grade explainable DNS defense platform. Intercept malicious queries, forecast multi-stage APT kill-chains, and automate preemptive containment.",
  keywords: [
    "DNS Security",
    "Threat Forecasting",
    "Explainable AI",
    "SHAP Attribution",
    "MITRE ATT&CK",
    "APT Detection",
    "SOC Automation",
    "DGA Detection",
    "DNS Tunneling",
  ],
  authors: [{ name: "DNS Shield Security Team" }],
  creator: "DNS Shield",
  publisher: "DNS Shield Autonomous Defense",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "DNS Shield — Explainable DNS Threat Defense & APT Forecasting",
    description:
      "Enterprise-grade explainable DNS defense platform. Intercept malicious queries, forecast multi-stage APT kill-chains, and automate preemptive containment.",
    url: "https://dns-shield.security",
    siteName: "DNS Shield",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DNS Shield — Explainable DNS Threat Defense & APT Forecasting",
    description:
      "Enterprise-grade explainable DNS defense platform. Intercept malicious queries, forecast multi-stage APT kill-chains, and automate preemptive containment.",
    creator: "@DNSShieldSec",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [{ url: "/icon.svg" }],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://dns-shield.security/#organization",
      "name": "DNS Shield",
      "url": "https://dns-shield.security",
      "logo": "https://dns-shield.security/icon.svg",
      "description": "Autonomous DNS Threat Defense & Temporal Attack Forecasting Platform",
    },
    {
      "@type": "WebSite",
      "@id": "https://dns-shield.security/#website",
      "url": "https://dns-shield.security",
      "name": "DNS Shield",
      "publisher": {
        "@id": "https://dns-shield.security/#organization",
      },
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://dns-shield.security/#software",
      "name": "DNS Shield Security Operations Suite",
      "applicationCategory": "SecurityApplication",
      "operatingSystem": "All",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD",
      },
      "featureList": [
        "7-Stage Explainable DNS Threat Inspection Pipeline",
        "Multi-Stage APT Kill-Chain Temporal Forecaster (GRU & Markov)",
        "Preemptive Device Fleet Quarantine & Blast Radius Analysis",
        "Real-Time SHAP & Permutation Feature Attribution",
      ],
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body suppressHydrationWarning className="min-h-full bg-slate-50 text-slate-900 font-sans">
        {children}
      </body>
    </html>
  );
}
