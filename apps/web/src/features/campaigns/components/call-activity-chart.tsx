"use client";

import { useState } from "react";
import type { CallActivityBucket } from "../lib/types";

interface CallActivityChartProps {
  buckets: CallActivityBucket[];
}

export function CallActivityChart({ buckets }: CallActivityChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(buckets.length > 0 ? buckets.length - 1 : null);
  const [showTable, setShowTable] = useState(false);

  if (buckets.length === 0) {
    return (
      <div className="bg-white border border-border-faint rounded-12 p-5 shadow-xs">
        <h3 className="text-sm font-bold text-accent-black tracking-tight">Call activity</h3>
        <p className="text-[11px] text-neutral-400">Call attempts started by hour &middot; UTC</p>
        <p className="text-xs text-neutral-400 italic py-10 text-center">No call activity recorded yet.</p>
      </div>
    );
  }

  const maxY = 250;
  const chartHeight = 180;
  const chartWidth = 520;
  const paddingLeft = 36;
  const paddingRight = 20;
  const paddingTop = 30;
  const paddingBottom = 30;

  const innerWidth = chartWidth - paddingLeft - paddingRight;
  const innerHeight = chartHeight - paddingTop - paddingBottom;

  const barCount = buckets.length;
  const barWidth = 36;
  const step = barCount > 1 ? innerWidth / barCount : innerWidth;

  const yTicks = [250, 200, 100, 0];

  return (
    <div className="bg-white border border-border-faint rounded-12 p-5 shadow-xs space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-bold text-accent-black tracking-tight">
            Call activity
          </h3>
          <p className="text-[11px] text-neutral-400">
            Call attempts started by hour &middot; UTC
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowTable((s) => !s)}
          className="text-[11px] font-mono text-neutral-400 hover:text-neutral-700 underline"
        >
          {showTable ? "Hide data table" : "View data table"}
        </button>
      </div>

      {/* SVG Chart */}
      <div className="relative w-full overflow-hidden select-none">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-auto max-h-[220px]"
          aria-label="Call activity bar chart"
        >
          {/* Horizontal Gridlines & Y-Axis Labels */}
          {yTicks.map((tick) => {
            const y = paddingTop + innerHeight - (tick / maxY) * innerHeight;
            return (
              <g key={tick}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={chartWidth - paddingRight}
                  y2={y}
                  stroke="#ededed"
                  strokeWidth="1"
                  strokeDasharray={tick === 0 ? "none" : "2,2"}
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 3}
                  textAnchor="end"
                  fontSize="10"
                  fontFamily="monospace"
                  fill="#a3a3a3"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {buckets.map((b, idx) => {
            const barH = (b.attempts / maxY) * innerHeight;
            const x = paddingLeft + idx * step + (step - barWidth) / 2;
            const y = paddingTop + innerHeight - barH;
            const isHovered = hoveredIdx === idx;

            return (
              <g
                key={b.hourLabel}
                className="cursor-pointer transition-opacity"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(buckets.length - 1)}
              >
                {/* Bar */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={Math.max(2, barH)}
                  rx="3"
                  fill="#fa5d19"
                  className="transition-all duration-150"
                  opacity={isHovered ? 1 : 0.9}
                />

                {/* Top Number Label */}
                <text
                  x={x + barWidth / 2}
                  y={y - 6}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="600"
                  fontFamily="monospace"
                  fill="#262626"
                >
                  {b.attempts}
                </text>

                {/* X-axis Hour Label */}
                <text
                  x={x + barWidth / 2}
                  y={chartHeight - 10}
                  textAnchor="middle"
                  fontSize="10"
                  fontFamily="monospace"
                  fill="#737373"
                >
                  {b.hourLabel}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Box (matching screenshot: 14:00 / 216 attempts) */}
        {hoveredIdx !== null && buckets[hoveredIdx] && (
          <div
            className="absolute top-2 right-4 bg-white/95 border border-border-faint rounded-8 p-2 shadow-sm text-center pointer-events-none"
            style={{ minWidth: "90px" }}
          >
            <p className="text-[10px] font-mono text-neutral-400">
              {buckets[hoveredIdx].hourLabel}
            </p>
            <p className="text-xs font-bold text-accent-black font-mono">
              {buckets[hoveredIdx].attempts} attempts
            </p>
          </div>
        )}
      </div>

      {/* Semantic Accessible Data Table */}
      {showTable && (
        <div className="pt-2 border-t border-border-faint text-xs">
          <table className="w-full text-left font-mono">
            <thead>
              <tr className="border-b border-border-faint text-neutral-400">
                <th className="py-1">Hour (UTC)</th>
                <th className="py-1 text-right">Attempts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-faint text-neutral-700">
              {buckets.map((b) => (
                <tr key={b.hourLabel}>
                  <td className="py-1">{b.hourLabel}</td>
                  <td className="py-1 text-right">{b.attempts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
