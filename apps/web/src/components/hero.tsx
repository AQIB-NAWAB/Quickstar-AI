"use client";

import Link from "next/link";
import { ArrowRight, Copy, Check, Sparkles } from "lucide-react";
import { useState } from "react";

export function Hero() {
  const [copied, setCopied] = useState(false);
  const installCmd = "npm install @quickstart/sdk";

  const handleCopy = () => {
    navigator.clipboard.writeText(installCmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="relative pt-12 pb-8 sm:pt-20 sm:pb-12 text-center overflow-hidden">
      {/* Background Architectural Grid Lines */}
      <div className="absolute inset-0 -z-10 pointer-events-none opacity-40 firecrawl-grid [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Top Pill Badge */}
        <Link
          href="#architecture"
          className="inline-flex items-center gap-2 p-1 pr-3 rounded-full text-xs font-medium text-neutral-600 bg-white border border-border-faint hover:border-neutral-300 transition-all shadow-sm mb-6 group"
        >
          <span className="px-2.5 py-0.5 rounded-full bg-heat-12 text-heat-100 font-semibold flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-heat-100" />
            Enterprise
          </span>
          <span>Production-Scale Multi-Tenant AI Agent Platform</span>
          <div className="w-4 h-4 rounded-full bg-accent-black text-white flex items-center justify-center group-hover:bg-heat-100 transition-colors">
            <ArrowRight className="w-2.5 h-2.5" />
          </div>
        </Link>

        {/* Hero Title with exact Firecrawl Swiss styling */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-accent-black leading-[1.1] mb-6">
          Build &amp; Deploy Autonomous AI Agents <br className="hidden sm:inline" />
          <span className="text-heat-100">across Chat, Voice &amp; Workflows</span>
        </h1>

        {/* Subtitle */}
        <p className="max-w-2xl mx-auto text-base sm:text-lg text-neutral-600 leading-relaxed mb-8">
          Connect your enterprise knowledge, private tools, and APIs. Deploy
          production-ready AI agents across website chat, telephony voice calls, and
          automated pipelines with{" "}
          <span className="text-accent-black font-semibold">
            10,000 req/sec scale
          </span>{" "}
          and zero data leakage.
        </p>

        {/* Action CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
          <Link
            href="/register"
            className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 rounded-10 text-sm font-semibold text-white bg-heat-100 hover:bg-[#e04f12] active:scale-[0.98] transition-all shadow-firecrawl-btn"
          >
            Start Building Free
          </Link>

          <button
            onClick={handleCopy}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-10 text-sm font-medium text-accent-black bg-white hover:bg-neutral-50 active:scale-[0.98] border border-border-faint hover:border-neutral-300 transition-all shadow-sm group"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700 font-semibold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-neutral-500 group-hover:text-accent-black transition-colors" />
                <span>npm i @quickstart/sdk</span>
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}

