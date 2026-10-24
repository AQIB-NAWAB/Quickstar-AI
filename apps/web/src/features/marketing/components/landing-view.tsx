"use client";

import "@/app/landing.css";
import { useRef } from "react";
import { useLandingScrollAnimations } from "@/features/marketing/lib/use-landing-scroll-animations";

import { CtaBanner } from "@/features/marketing/components/cta-banner";
import { Footer } from "@/features/marketing/components/footer";
import { Hero } from "@/features/marketing/components/hero";
import { BuiltOnSection } from "@/features/marketing/sections/built-on";
import { ChannelsSection } from "@/features/marketing/sections/channels";
import { ScenarioDemoSection } from "@/features/marketing/sections/scenario-demo";
import { HowItWorksSection } from "@/features/marketing/sections/how-it-works";
import { LeadGenerationSection } from "@/features/marketing/sections/lead-generation";
import { VisualBuilderSection } from "@/features/marketing/sections/visual-builder";
import { KnowledgeMemorySection } from "@/features/marketing/sections/knowledge-memory";
import { VoiceRehearsalSection } from "@/features/marketing/sections/voice-rehearsal";
import { DevelopersSection } from "@/features/marketing/sections/developers";
import { SecurityControlSection } from "@/features/marketing/sections/security-control";
import { ScaleSection } from "@/features/marketing/sections/scale";
import { IntegrationsSection } from "@/features/marketing/sections/integrations";
import { UseCasesSection } from "@/features/marketing/sections/use-cases";
import { HumanHandoffSection } from "@/features/marketing/sections/human-handoff";
import { Navbar } from "@/features/marketing/components/navbar";
import { PricingSection } from "@/features/marketing/components/pricing-section";
import { FaqSection } from "@/features/marketing/sections/faq";

export function LandingView() {
  const landingRef = useRef<HTMLDivElement>(null);
  useLandingScrollAnimations(landingRef);

  return (
    <div ref={landingRef} className="landing-page relative min-h-screen flex flex-col bg-background-base">
      <Navbar />

      <main className="flex-1">
        {/* 1. Hero Section */}
        <Hero />

        {/* 2. Built On Technology Strip */}
        <BuiltOnSection />

        {/* 3. Channels Bento Grid */}
        <ChannelsSection />

        {/* 4. Scenario Demo */}
        <ScenarioDemoSection />

        {/* 5. How It Works */}
        <HowItWorksSection />

        {/* 6. Lead Generation */}
        <LeadGenerationSection />

        {/* 7. Visual Builder */}
        <VisualBuilderSection />

        {/* 8. Human Handoff */}
        <HumanHandoffSection />

        {/* Knowledge & Memory */}
        <KnowledgeMemorySection />

        {/* Voice Rehearsal */}
        <VoiceRehearsalSection />

        {/* Developers */}
        <DevelopersSection />

        {/* Security & Control */}
        <SecurityControlSection />

        {/* Built to Scale */}
        <ScaleSection />

        {/* Integrations Ecosystem */}
        <IntegrationsSection />

        {/* Everyday Jobs / Use Cases */}
        <UseCasesSection />

        {/* Plans & Pricing */}
        <PricingSection />

        {/* FAQ Section */}
        <FaqSection />

        {/* 6. Closing Call-to-Action Banner */}
        <CtaBanner />
      </main>

      <Footer />
    </div>
  );
}
