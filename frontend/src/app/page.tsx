import { LandingNav } from "@/components/landing/LandingNav";
import { HeroSection } from "@/components/landing/HeroSection";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { LiveMetrics } from "@/components/landing/LiveMetrics";
import { SampleCatches } from "@/components/landing/SampleCatches";
import { IntegrationSection } from "@/components/landing/IntegrationSection";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function LandingPage() {
  return (
    <>
      <LandingNav />
      <main>
        <HeroSection />
        <HowItWorks />
        <LiveMetrics />
        <SampleCatches />
        <IntegrationSection />
      </main>
      <LandingFooter />
    </>
  );
}
