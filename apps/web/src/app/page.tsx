"use client";

import { Navbar } from "@/components/navbar";
import { Hero } from "@/components/hero";
import { CodePlayground } from "@/components/code-playground";
import { SocialProof } from "@/components/social-proof";
import { HowItWorksSection } from "@/components/how-it-works-section";
import { FeatureGrid } from "@/components/feature-grid";
import { MetricsSection } from "@/components/metrics-section";
import { InfrastructureSection } from "@/components/infrastructure-section";
import { ArchitectureSection } from "@/components/architecture-section";
import { PricingSection } from "@/components/pricing-section";
import { CtaBanner } from "@/components/cta-banner";
import { Footer } from "@/components/footer";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-background-base">
      <Navbar />

      <main className="flex-1">
        {/* 1. Hero Section */}
        <Hero />

        {/* 2. Playground: Give it a job */}
        <CodePlayground />

        {/* 3. Social Proof */}
        <SocialProof />

        {/* 4. How It Works: Your knowledge. Your tools. One published agent. */}
        <HowItWorksSection />

        {/* 5. Platform Capabilities: The pieces behind a useful agent */}
        <FeatureGrid />

        {/* 6. Runtime Reliability: Useful work needs clear limits */}
        <MetricsSection />

        {/* 7. Infrastructure: One entry point. Purpose-built services */}
        <InfrastructureSection />

        {/* 8. Engine Architecture */}
        <ArchitectureSection />

        {/* 9. Transparent Pricing */}
        <PricingSection />

        {/* 10. High-Conversion CTA Banner */}
        <CtaBanner />
      </main>

      <Footer />
    </div>
  );
}
