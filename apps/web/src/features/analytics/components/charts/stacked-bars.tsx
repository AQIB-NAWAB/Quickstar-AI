"use client";

import { useId,useState } from "react";
import { formatCompactNumber,formatExactNumber,formatUtcFullDate,formatUtcMonthDay } from "../../lib/format";
import type { DailyTokensPoint } from "../../lib/types";
import { ChartTooltip } from "./chart-tooltip";

interface StackedBarsProps {
  data: DailyTokensPoint[];
  height?: number;
}

export function StackedBars({ data, height = 180 }: StackedBarsProps) {
  const chartId = useId();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-[180px] flex items-center justify-center text-xs text-neutral-400">
        No token consumption recorded in this period.
      </div>
    );
  }

  // Find max total tokens
  const maxTotal = Math.max(...data.map((d) => d.totalTokens), 100);

  // Compute nice Y-axis max (rounding up to 10K, 50K, 100K, etc.)
  const magnitude = Math.pow(10, Math.floor(Math.log10(maxTotal)));
  const normalized = maxTotal / magnitude;
  let niceFactor = 1;
  if (normalized > 5) niceFactor = 10;
  else if (normalized > 2) niceFactor = 5;
  else if (normalized > 1) niceFactor = 2;
  const yMax = Math.ceil(maxTotal / (magnitude * niceFactor * 0.25)) * (magnitude * niceFactor * 0.25);

  const yTicks = [
    0,
    Math.round(yMax * 0.33),
    Math.round(yMax * 0.66),
    Math.round(yMax),
  ];

  // SVG dimensions
  const svgWidth = 520;
  const svgHeight = height;
  const padLeft = 46;
  const padRight = 14;
  const padTop = 16;
  const padBottom = 26;

  const plotWidth = svgWidth - padLeft - padRight;
  const plotHeight = svgHeight - padTop - padBottom;

  const barSlotWidth = plotWidth / data.length;
  const barWidth = Math.max(2, Math.min(18, barSlotWidth * 0.65));

  // Determine which X ticks to show (~4 to 5 ticks)
  const xTickIndices: number[] = [];
  if (data.length <= 7) {
    data.forEach((_, i) => xTickIndices.push(i));
  } else {
    const step = Math.floor(data.length / 4);
    for (let i = 0; i < data.length; i += step) {
      xTickIndices.push(i);
    }
    if (xTickIndices[xTickIndices.length - 1] !== data.length - 1) {
      if (data.length - 1 - xTickIndices[xTickIndices.length - 1] < Math.ceil(step / 2)) xTickIndices.pop();
      xTickIndices.push(data.length - 1);
    }
  }

  const activePoint = hoveredIdx !== null ? data[hoveredIdx] : null;

  return (
    <div className="relative w-full" onMouseLeave={() => setHoveredIdx(null)}>
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full h-auto sm:h-[180px] overflow-visible select-none"
        preserveAspectRatio="none"
        aria-label="Token consumption stacked bar chart"
        role="img"
      >
        <title id={`${chartId}-title`}>Token consumption by day</title>
        <desc id={`${chartId}-desc`}>
          Daily input and output tokens rendered as stacked bars.
        </desc>

        {/* Horizontal grid lines & Y labels */}
        {yTicks.map((tickVal, idx) => {
          const yPos = padTop + plotHeight - (tickVal / yMax) * plotHeight;
          return (
            <g key={idx}>
              <line
                x1={padLeft}
                y1={yPos}
                x2={svgWidth - padRight}
                y2={yPos}
                stroke="#ededed"
                strokeWidth="1"
              />
              <text
                x={padLeft - 8}
                y={yPos + 3.5}
                textAnchor="end"
                className="fill-neutral-400 text-[10px] font-mono tabular-nums"
              >
                {formatCompactNumber(tickVal)}
              </text>
            </g>
          );
        })}

        {/* Stacked Bars */}
        {data.map((d, idx) => {
          const xCenter = padLeft + idx * barSlotWidth + barSlotWidth / 2;
          const xBar = xCenter - barWidth / 2;

          const inputHeight = (d.inputTokens / yMax) * plotHeight;
          const outputHeight = (d.outputTokens / yMax) * plotHeight;

          const inputY = padTop + plotHeight - inputHeight;
          const outputY = inputY - outputHeight;

          const isHovered = hoveredIdx === idx;

          return (
            <g
              key={d.date}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIdx(idx)}
              onFocus={() => setHoveredIdx(idx)}
              tabIndex={0}
              aria-label={`${d.date}: ${d.totalTokens.toLocaleString()} tokens`}
            >
              {/* Invisible wider hover hit target */}
              <rect
                x={padLeft + idx * barSlotWidth}
                y={padTop}
                width={barSlotWidth}
                height={plotHeight}
                fill="transparent"
              />

              {/* Hover column background highlight */}
              {isHovered && (
                <rect
                  x={padLeft + idx * barSlotWidth}
                  y={padTop}
                  width={barSlotWidth}
                  height={plotHeight}
                  fill="#fa5d19"
                  opacity="0.06"
                />
              )}

              {/* Input tokens bar (bottom) */}
              <rect
                x={xBar}
                y={inputY}
                width={barWidth}
                height={Math.max(0, inputHeight)}
                fill="#fa5d19"
                opacity={hoveredIdx !== null && !isHovered ? 0.6 : 1}
                rx={outputHeight <= 0 ? 1.5 : 0}
              />

              {/* Output tokens bar (top) */}
              <rect
                x={xBar}
                y={outputY}
                width={barWidth}
                height={Math.max(0, outputHeight)}
                fill="#a3a3a3"
                opacity={hoveredIdx !== null && !isHovered ? 0.6 : 1}
                rx={1.5}
              />
            </g>
          );
        })}

        {/* X Axis ticks */}
        {xTickIndices.map((idx) => {
          const d = data[idx];
          if (!d) return null;
          const xCenter = padLeft + idx * barSlotWidth + barSlotWidth / 2;
          return (
            <text
              key={d.date}
              x={xCenter}
              y={svgHeight - 6}
              textAnchor="middle"
              className="fill-neutral-400 text-[10px] font-sans"
            >
              {formatUtcMonthDay(d.date)}
            </text>
          );
        })}
      </svg>

      {/* Floating Tooltip */}
      {hoveredIdx !== null && activePoint && (
        <ChartTooltip
          x={
            ((padLeft + hoveredIdx * barSlotWidth + barSlotWidth / 2) /
              svgWidth) *
            100
          }
          y={
            ((padTop +
              plotHeight -
              ((activePoint.totalTokens / yMax) * plotHeight)) /
              svgHeight) *
            100
          }
          title={formatUtcFullDate(activePoint.date)}
          items={[
            {
              label: "Input",
              value: formatExactNumber(activePoint.inputTokens),
              color: "#fa5d19",
            },
            {
              label: "Output",
              value: formatExactNumber(activePoint.outputTokens),
              color: "#a3a3a3",
            },
            {
              label: "Total",
              value: formatExactNumber(activePoint.totalTokens),
            },
          ]}
          visible={true}
          align={
            hoveredIdx < 3
              ? "left"
              : hoveredIdx > data.length - 4
              ? "right"
              : "center"
          }
        />
      )}
    </div>
  );
}
