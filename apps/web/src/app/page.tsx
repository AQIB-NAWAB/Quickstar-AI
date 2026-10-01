"use client";

import { useState } from "react";
import { Navbar } from "@/components/navbar";
import { Hero } from "@/components/hero";
import { InteractiveUrlBar, ModeType } from "@/components/interactive-url-bar";
import { CodePlayground } from "@/components/code-playground";
import { SocialProof } from "@/components/social-proof";
import { FeatureGrid } from "@/components/feature-grid";
import { ArchitectureSection } from "@/components/architecture-section";
import { PricingSection } from "@/components/pricing-section";
import { CtaBanner } from "@/components/cta-banner";
import { Footer } from "@/components/footer";

export default function HomePage() {
  const [activeMode, setActiveMode] = useState<ModeType>("scrape");
  const [targetUrl, setTargetUrl] = useState("https://mendable.ai");
  const [loading, setLoading] = useState(false);

  const handleRun = (mode: ModeType, url: string) => {
    setActiveMode(mode);
    setTargetUrl(url);
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 600);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background-base">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <Hero />

        {/* Central Signature Interactive URL Bar */}
        <div className="relative -mt-2 z-10">
          <InteractiveUrlBar onRun={handleRun} isLoading={loading} />
          {/* Split Code & Clean Markdown Preview */}
          <CodePlayground currentMode={activeMode} currentUrl={targetUrl} />
        </div>

        {/* Social Proof */}
        <div className="mt-20">
          <SocialProof />
        </div>

        {/* 4 Feature Pillars (Scrape, Crawl, Map, Extract) */}
        <FeatureGrid />

        {/* Engine Architecture */}
        <ArchitectureSection />

        {/* Transparent Pricing */}
        <PricingSection />

        {/* CTA Banner */}
        <CtaBanner />
      </main>

      <Footer />
    </div>
  );
}
