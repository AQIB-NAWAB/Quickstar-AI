"use client";

import { useId,useState } from "react";
import { formatCompactNumber,formatPercentage } from "../../lib/format";
import type { ModelUsageItem } from "../../lib/types";

interface DonutChartProps {
  models: ModelUsageItem[];
  totalTokens?: number;
  coverageNote?: string;
}

const PALETTE = [
  "#fa5d19", // heat-100 (largest)
  "#737373", // neutral-500 (second)
  "#d4d4d4", // neutral-300 (third)
  "#fb824d", // muted warm orange (fourth)
  "#a3a3a3", // neutral-400 (fifth)
  "#e5e5e5", // neutral-200 (other)
];

export function DonutChart({
  models,
  totalTokens: propTotal,
  coverageNote,
}: DonutChartProps) {
  const chartId = useId();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const total = propTotal ?? models.reduce((acc, m) => acc + m.tokens, 0);

  if (!models || models.length === 0 || total === 0) {
    return (
      <div className="h-[180px] flex items-center justify-center text-xs text-neutral-400">
        No model usage in this period.
      </div>
    );
  }

  // Sort descending by token total
  const sorted = [...models].sort((a, b) => b.tokens - a.tokens);

  // If > 4 models, aggregate remaining into "Other" for donut slices
  let sliceItems: { label: string; tokens: number; percentage: number; color: string }[] = [];
  if (sorted.length <= 4) {
    sliceItems = sorted.map((m, idx) => ({
      label: `${m.provider} · ${m.model}`,
      tokens: m.tokens,
      percentage: m.percentage,
      color: PALETTE[idx % PALETTE.length],
    }));
  } else {
    const top4 = sorted.slice(0, 4);
    const rest = sorted.slice(4);
    const restTokens = rest.reduce((sum, m) => sum + m.tokens, 0);
    const restPercentage = total > 0 ? (restTokens / total) * 100 : 0;

    sliceItems = top4.map((m, idx) => ({
      label: `${m.provider} · ${m.model}`,
      tokens: m.tokens,
      percentage: m.percentage,
      color: PALETTE[idx],
    }));

    sliceItems.push({
      label: "Other models",
      tokens: restTokens,
      percentage: restPercentage,
      color: PALETTE[5] || "#a3a3a3",
    });
  }

  // SVG Geometry
  const size = 160;
  const strokeWidth = 22;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 w-full">
      {/* Donut SVG */}
      <div className="relative shrink-0 flex items-center justify-center select-none">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="overflow-visible -rotate-90"
          aria-label="Model breakdown donut chart"
          role="img"
        >
          <title id={`${chartId}-title`}>Token share by provider and model</title>
          {/* Base track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#f5f5f5"
            strokeWidth={strokeWidth}
          />

          {/* Slices */}
          {sliceItems.map((slice, idx) => {
            const pct = slice.percentage / 100;
            const strokeDasharray = `${pct * circumference} ${circumference}`;
            const strokeDashoffset = -(accumulatedPercent * circumference);
            accumulatedPercent += pct;

            const isHovered = hoveredIdx === idx;

            return (
              <circle
                key={idx}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke={slice.color}
                strokeWidth={isHovered ? strokeWidth + 3 : strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="butt"
                className="transition-all duration-150 cursor-pointer"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                tabIndex={0}
                aria-label={`${slice.label}: ${formatPercentage(slice.percentage)}`}
              />
            );
          })}
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          <span className="text-base font-bold font-mono tracking-tight text-accent-black">
            {formatCompactNumber(total)}
          </span>
          <span className="text-[10px] text-neutral-400 font-medium">tokens</span>
        </div>
      </div>

      {/* Model Legend list */}
      <div className="flex-1 w-full space-y-2 min-w-0">
        <div className="space-y-2">
          {(isExpanded ? sorted : sorted.slice(0, 4)).map((m, idx) => {
            const isHovered = hoveredIdx === idx;
            const color = PALETTE[idx % PALETTE.length];

            return (
              <div
                key={`${m.provider}-${m.model}`}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className={`flex items-center justify-between gap-3 text-xs p-1.5 rounded-6 transition-colors ${
                  isHovered ? "bg-neutral-50" : ""
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <div className="min-w-0">
                    <p className="font-semibold text-accent-black text-[12px] truncate">
                      {m.model}
                    </p>
                    <p className="text-[10px] text-neutral-400 truncate">
                      {m.provider}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-mono font-medium text-accent-black text-[12px] block">
                    {formatCompactNumber(m.tokens)}
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    {formatPercentage(m.percentage)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {sorted.length > 4 && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[11px] font-medium text-neutral-500 hover:text-accent-black transition-colors pt-1"
          >
            {isExpanded ? "Show fewer models" : `+${sorted.length - 4} more models`}
          </button>
        )}

        {coverageNote && (
          <p className="text-[10px] text-neutral-400 pt-1 italic">
            {coverageNote}
          </p>
        )}
      </div>
    </div>
  );
}
