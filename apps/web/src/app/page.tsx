"use client";

import { Navbar } from "@/components/navbar";
import { Hero } from "@/components/hero";
import { SocialProof } from "@/components/social-proof";
import { HowItWorksSection } from "@/components/how-it-works-section";
import { FeatureGrid } from "@/components/feature-grid";
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

        {/* 2. Social Proof */}
        <SocialProof />

        {/* 3. How It Works: From your information to a working agent */}
        <HowItWorksSection />

        {/* 4. Platform Capabilities: Built for your team */}
        <FeatureGrid />

        {/* 5. Plans & Pricing */}
        <PricingSection />

        {/* 6. Closing Call-to-Action Banner */}
        <CtaBanner />
      </main>

      <Footer />
    </div>
  );
}
