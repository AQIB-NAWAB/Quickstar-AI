"use client";

import { useState } from "react";
import { formatNumber, formatPercent } from "../lib/format";
import type { CampaignMetrics } from "../lib/types";

interface CampaignOutcomesDonutProps {
  metrics: CampaignMetrics;
  heldContactsCount?: number;
}

interface OutcomeSlice {
  id: string;
  label: string;
  count: number;
  color: string;
  bgClass: string;
}

export function CampaignOutcomesDonut({
  metrics,
  heldContactsCount = 0,
}: CampaignOutcomesDonutProps) {
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);

  const answered = metrics.answeredContacts;
  const busyNoAnswer = Math.max(0, metrics.completedContacts - metrics.answeredContacts);
  const active = metrics.activeCalls;
  const queued = Math.max(0, metrics.queuedContacts - heldContactsCount);
  const held = heldContactsCount;

  const slices: OutcomeSlice[] = [
    {
      id: "answered",
      label: "Answered",
      count: answered,
      color: "#10B981", // Emerald
      bgClass: "bg-emerald-500",
    },
    {
      id: "busy",
      label: "Busy / No-answer",
      count: busyNoAnswer,
      color: "#F59E0B", // Amber
      bgClass: "bg-amber-500",
    },
    {
      id: "active",
      label: "Active dialing",
      count: active,
      color: "#FF571A", // Brand Orange
      bgClass: "bg-heat-100",
    },
    {
      id: "held",
      label: "Held (window / tz)",
      count: held,
      color: "#8B5CF6", // Violet
      bgClass: "bg-purple-500",
    },
    {
      id: "queued",
      label: "Queued pending",
      count: queued,
      color: "#94A3B8", // Slate
      bgClass: "bg-slate-400",
    },
  ];

  const total = metrics.eligibleContacts || slices.reduce((acc, s) => acc + s.count, 0);

  // SVG Donut geometry
  const size = 160;
  const strokeWidth = 22;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  return (
    <div className="bg-white border border-border-faint rounded-12 p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-accent-black tracking-tight">
            Audience outcomes
          </h3>
          <p className="text-[11px] text-neutral-400">
            Real-time contact status breakdown
          </p>
        </div>
        <span className="text-xs font-mono font-bold text-accent-black">
          {formatNumber(total)} total
        </span>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6 pt-1">
        {/* SVG Donut */}
        <div className="relative w-40 h-40 shrink-0 flex items-center justify-center">
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="transform -rotate-90 select-none"
            aria-label="Campaign outcomes donut chart"
          >
            {/* Background ring */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#F1F3F5"
              strokeWidth={strokeWidth}
              fill="transparent"
            />

            {total > 0 &&
              slices.map((slice) => {
                const percent = (slice.count / total) * 100;
                if (percent <= 0) return null;

                const strokeDasharray = `${(percent / 100) * circumference} ${circumference}`;
                const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
                accumulatedPercent += percent;

                const isHovered = hoveredSlice === slice.id;

                return (
                  <circle
                    key={slice.id}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={slice.color}
                    strokeWidth={isHovered ? strokeWidth + 3 : strokeWidth}
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    fill="transparent"
                    className="transition-all duration-200 cursor-pointer"
                    onMouseEnter={() => setHoveredSlice(slice.id)}
                    onMouseLeave={() => setHoveredSlice(null)}
                  />
                );
              })}
          </svg>

          {/* Donut Center */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            {hoveredSlice ? (
              (() => {
                const h = slices.find((s) => s.id === hoveredSlice);
                return (
                  <>
                    <span className="text-xl font-bold font-mono text-accent-black">
                      {h ? formatNumber(h.count) : 0}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-medium">
                      {h?.label}
                    </span>
                  </>
                );
              })()
            ) : (
              <>
                <span className="text-xl font-bold font-mono text-accent-black">
                  {formatPercent(metrics.answerRate, 0)}
                </span>
                <span className="text-[10px] text-neutral-400 font-medium uppercase tracking-wider">
                  Answered
                </span>
              </>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 w-full space-y-2 text-xs">
          {slices.map((slice) => {
            const pct = total > 0 ? (slice.count / total) * 100 : 0;
            const isHovered = hoveredSlice === slice.id;

            return (
              <div
                key={slice.id}
                onMouseEnter={() => setHoveredSlice(slice.id)}
                onMouseLeave={() => setHoveredSlice(null)}
                className={`flex items-center justify-between py-1 px-2 rounded-6 transition-colors cursor-pointer ${
                  isHovered ? "bg-neutral-50 font-semibold" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: slice.color }}
                  />
                  <span className="text-neutral-600">{slice.label}</span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-accent-black font-semibold">
                    {formatNumber(slice.count)}
                  </span>
                  <span className="text-[11px] text-neutral-400 w-10 text-right">
                    {formatPercent(pct, 0)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
