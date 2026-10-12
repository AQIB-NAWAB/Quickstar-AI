"use client";

import { useId,useState } from "react";
import { formatCompactNumber,formatExactNumber,formatHourIntervalUtc } from "../../lib/format";
import type { HourlyConversationPoint } from "../../lib/types";
import { ChartTooltip } from "./chart-tooltip";

interface HourlyBarsProps {
  data: HourlyConversationPoint[];
  height?: number;
}

export function HourlyBars({ data, height = 180 }: HourlyBarsProps) {
  const chartId = useId();
  const [hoveredHour, setHoveredHour] = useState<number | null>(null);

  // Guarantee 24 hours (0..23)
  const buckets: HourlyConversationPoint[] = Array.from({ length: 24 }, (_, h) => {
    void _;
    const existing = data.find((d) => d.hour === h);
    return existing ?? { hour: h, conversations: 0 };
  });

  const maxVal = Math.max(...buckets.map((b) => b.conversations), 5);

  // Nice Y-axis max
  const magnitude = Math.pow(10, Math.floor(Math.log10(maxVal)));
  const normalized = maxVal / magnitude;
  let niceFactor = 1;
  if (normalized > 5) niceFactor = 10;
  else if (normalized > 2) niceFactor = 5;
  else if (normalized > 1) niceFactor = 2;
  const yMax = Math.ceil(maxVal / (magnitude * niceFactor * 0.25)) * (magnitude * niceFactor * 0.25);

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

  const barSlotWidth = plotWidth / 24;
  const barWidth = Math.max(3, barSlotWidth * 0.65);

  // X ticks specifically: 00, 06, 12, 18, 23
  const xTickHours = [0, 6, 12, 18, 23];

  const activeBucket = hoveredHour !== null ? buckets[hoveredHour] : null;

  return (
    <div className="relative w-full" onMouseLeave={() => setHoveredHour(null)}>
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full h-auto sm:h-[180px] overflow-visible select-none"
        preserveAspectRatio="none"
        aria-label="Hourly conversation starts bar chart"
        role="img"
      >
        <title id={`${chartId}-title`}>Conversation starts by hour (UTC)</title>

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

        {/* 24 Bars */}
        {buckets.map((b) => {
          const xCenter = padLeft + b.hour * barSlotWidth + barSlotWidth / 2;
          const xBar = xCenter - barWidth / 2;
          const barHeight = (b.conversations / yMax) * plotHeight;
          const barY = padTop + plotHeight - barHeight;
          const isHovered = hoveredHour === b.hour;

          return (
            <g
              key={b.hour}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredHour(b.hour)}
              onFocus={() => setHoveredHour(b.hour)}
              tabIndex={0}
              aria-label={`${formatHourIntervalUtc(b.hour)}: ${b.conversations} conversations`}
            >
              {/* Invisible hit box */}
              <rect
                x={padLeft + b.hour * barSlotWidth}
                y={padTop}
                width={barSlotWidth}
                height={plotHeight}
                fill="transparent"
              />

              {/* Hover column background highlight */}
              {isHovered && (
                <rect
                  x={padLeft + b.hour * barSlotWidth}
                  y={padTop}
                  width={barSlotWidth}
                  height={plotHeight}
                  fill="#fa5d19"
                  opacity="0.06"
                />
              )}

              {/* Bar */}
              <rect
                x={xBar}
                y={barY}
                width={barWidth}
                height={Math.max(0, barHeight)}
                fill="#fa5d19"
                opacity={hoveredHour !== null && !isHovered ? 0.6 : 1}
                rx={1.5}
              />
            </g>
          );
        })}

        {/* X Axis ticks: 00, 06, 12, 18, 23 */}
        {xTickHours.map((hour) => {
          const xCenter = padLeft + hour * barSlotWidth + barSlotWidth / 2;
          return (
            <text
              key={hour}
              x={xCenter}
              y={svgHeight - 6}
              textAnchor="middle"
              className="fill-neutral-400 text-[10px] font-mono"
            >
              {String(hour).padStart(2, "0")}
            </text>
          );
        })}
      </svg>

      {/* Floating Tooltip */}
      {hoveredHour !== null && activeBucket && (
        <ChartTooltip
          x={
            ((padLeft + hoveredHour * barSlotWidth + barSlotWidth / 2) /
              svgWidth) *
            100
          }
          y={
            ((padTop +
              plotHeight -
              ((activeBucket.conversations / yMax) * plotHeight)) /
              svgHeight) *
            100
          }
          title={formatHourIntervalUtc(activeBucket.hour)}
          items={[
            {
              label: "Conversations",
              value: formatExactNumber(activeBucket.conversations),
              color: "#fa5d19",
            },
          ]}
          visible={true}
          align={
            hoveredHour < 4
              ? "left"
              : hoveredHour > 19
              ? "right"
              : "center"
          }
        />
      )}
    </div>
  );
}
