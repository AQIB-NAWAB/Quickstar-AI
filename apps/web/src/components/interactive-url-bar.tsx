"use client";

import { Globe, ArrowRight, Search, FileCode2, MapPin, Network } from "lucide-react";
import { useState } from "react";

export type ModeType = "search" | "scrape" | "map" | "crawl";

interface InteractiveUrlBarProps {
  onRun?: (mode: ModeType, url: string) => void;
  isLoading?: boolean;
}

export function InteractiveUrlBar({ onRun, isLoading }: InteractiveUrlBarProps) {
  const [url, setUrl] = useState("https://mendable.ai");
  const [activeMode, setActiveMode] = useState<ModeType>("scrape");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onRun) {
      onRun(activeMode, url);
    }
  };

  const modes: { id: ModeType; label: string; icon: any }[] = [
    { id: "search", label: "Search", icon: Search },
    { id: "scrape", label: "Scrape", icon: FileCode2 },
    { id: "map", label: "Map", icon: MapPin },
    { id: "crawl", label: "Crawl", icon: Network },
  ];

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-0">
      <form
        onSubmit={handleSubmit}
        className="relative bg-surface rounded-20 border border-border-faint shadow-firecrawl-card transition-all hover:border-neutral-300"
      >
        {/* Top Input Row */}
        <div className="p-4 sm:p-5 flex items-center gap-3 border-b border-border-faint">
          <Globe className="w-5 h-5 text-neutral-400 shrink-0" />
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="w-full bg-transparent text-sm sm:text-base font-normal text-accent-black placeholder:text-neutral-400 focus:outline-none"
          />
          {url && (
            <button
              type="button"
              onClick={() => setUrl("")}
              className="text-xs text-neutral-400 hover:text-neutral-600 px-2 py-1 rounded"
            >
              Clear
            </button>
          )}
        </div>

        {/* Bottom Control Bar */}
        <div className="p-2 sm:p-3 flex items-center justify-between gap-2">
          {/* Segmented Mode Selector */}
          <div className="flex items-center bg-neutral-100/80 p-1 rounded-12 gap-1 border border-border-faint">
            {modes.map((mode) => {
              const Icon = mode.icon;
              const isActive = activeMode === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => {
                    setActiveMode(mode.id);
                    if (onRun) onRun(mode.id, url);
                  }}
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
            disabled={isLoading || !url}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-10 text-xs sm:text-sm font-semibold text-white bg-heat-100 hover:bg-[#e04f12] active:scale-[0.98] transition-all disabled:opacity-50 shadow-firecrawl-btn"
          >
            <span>{isLoading ? "Running..." : "Run"}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
}
