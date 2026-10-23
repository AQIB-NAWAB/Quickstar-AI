"use client";

import "./landing.css";

import { BrandCompanion } from "@/components/brand/brand-companion";
import { CtaBanner } from "@/features/marketing/components/cta-banner";
import { FeatureGrid } from "@/features/marketing/components/feature-grid";
import { Footer } from "@/features/marketing/components/footer";
import { Hero } from "@/features/marketing/components/hero";
import { HowItWorksSection } from "@/features/marketing/components/how-it-works-section";
import { Navbar } from "@/features/marketing/components/navbar";
import { PricingSection } from "@/features/marketing/components/pricing-section";
import { SocialProof } from "@/features/marketing/components/social-proof";
import { LandingChatWidget } from "@/features/marketing/components/landing-chat-widget";

export default function HomePage() {
  const widgetKey = process.env.NEXT_PUBLIC_LANDING_WIDGET_PUBLISHABLE_KEY;
  const widgetAgentId = process.env.NEXT_PUBLIC_LANDING_WIDGET_AGENT_ID;
  const widgetGatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL;
  const widgetConfig = widgetKey && widgetAgentId && widgetGatewayUrl
    ? { publishableKey: widgetKey, agentId: widgetAgentId, gatewayUrl: widgetGatewayUrl }
    : null;

  return (
    <div className="landing-page relative min-h-screen flex flex-col bg-background-base">
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
      <BrandCompanion restOnLeft={Boolean(widgetConfig)} />
      {widgetConfig && <LandingChatWidget {...widgetConfig} />}
    </div>
  );
}
