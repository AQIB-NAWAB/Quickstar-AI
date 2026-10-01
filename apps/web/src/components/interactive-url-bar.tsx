"use client";

import { Bot, ArrowRight, MessageSquare, PhoneCall, Database, Wrench } from "lucide-react";
import { useState } from "react";

export type ModeType = "chat" | "voice" | "knowledge" | "tools";

interface InteractiveUrlBarProps {
  onRun?: (mode: ModeType, prompt: string) => void;
  isLoading?: boolean;
}

export function InteractiveUrlBar({ onRun, isLoading }: InteractiveUrlBarProps) {
  const [prompt, setPrompt] = useState("Resolve customer refund requests and update Stripe CRM");
  const [activeMode, setActiveMode] = useState<ModeType>("chat");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onRun) {
      onRun(activeMode, prompt);
    }
  };

  const modes: { id: ModeType; label: string; icon: any; defaultPrompt: string }[] = [
    {
      id: "chat",
      label: "Omnichannel Chat",
      icon: MessageSquare,
      defaultPrompt: "Resolve customer refund requests and update Stripe CRM",
    },
    {
      id: "voice",
      label: "AI Voice Agent",
      icon: PhoneCall,
      defaultPrompt: "Handle incoming customer calls with <400ms audio latency",
    },
    {
      id: "knowledge",
      label: "Knowledge RAG",
      icon: Database,
      defaultPrompt: "Index internal refund-policy.pdf into OpenSearch vector index",
    },
    {
      id: "tools",
      label: "Tools & MCP",
      icon: Wrench,
      defaultPrompt: "Execute stripe_refunds(charge_id) with encrypted secrets vault",
    },
  ];

  const handleModeChange = (modeId: ModeType) => {
    setActiveMode(modeId);
    const modeConfig = modes.find((m) => m.id === modeId);
    const newPrompt = modeConfig ? modeConfig.defaultPrompt : prompt;
    setPrompt(newPrompt);
    if (onRun) onRun(modeId, newPrompt);
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-0">
      <form
        onSubmit={handleSubmit}
        className="relative bg-surface rounded-20 border border-border-faint shadow-firecrawl-card transition-all hover:border-neutral-300"
      >
        {/* Top Input Row */}
        <div className="p-4 sm:p-5 flex items-center gap-3 border-b border-border-faint">
          <Bot className="w-5 h-5 text-heat-100 shrink-0" />
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Instruct your agent (e.g. Schedule appointments, query database, answer inquiries)..."
            className="w-full bg-transparent text-sm sm:text-base font-normal text-accent-black placeholder:text-neutral-400 focus:outline-none"
          />
          {prompt && (
            <button
              type="button"
              onClick={() => setPrompt("")}
              className="text-xs text-neutral-400 hover:text-neutral-600 px-2 py-1 rounded"
            >
              Clear
            </button>
          )}
        </div>

        {/* Bottom Control Bar */}
        <div className="p-2 sm:p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Segmented Mode Selector */}
          <div className="flex flex-wrap items-center bg-neutral-100/80 p-1 rounded-12 gap-1 border border-border-faint w-full sm:w-auto">
            {modes.map((mode) => {
              const Icon = mode.icon;
              const isActive = activeMode === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => handleModeChange(mode.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-8 text-xs sm:text-sm font-medium transition-all ${
                    isActive
                      ? "bg-white text-accent-black shadow-sm font-semibold"
                      : "text-neutral-600 hover:text-accent-black hover:bg-neutral-200/50"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-heat-100" : "text-neutral-500"}`} />
                  <span>{mode.label}</span>
                </button>
              );
            })}
          </div>

          {/* Run Action Button */}
          <button
            type="submit"
            disabled={isLoading || !prompt}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-10 text-xs sm:text-sm font-semibold text-white bg-heat-100 hover:bg-[#e04f12] active:scale-[0.98] transition-all disabled:opacity-50 shadow-firecrawl-btn"
          >
            <span>{isLoading ? "Running..." : "Test Agent"}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
}

