"use client";

import { useId,useState } from "react";
import { formatCompactNumber,formatExactNumber,formatUtcFullDate,formatUtcMonthDay } from "../../lib/format";
import type { DailyConversationPoint } from "../../lib/types";
import { ChartTooltip } from "./chart-tooltip";

interface LineChartProps {
  data: DailyConversationPoint[];
  height?: number;
}

export function LineChart({ data, height = 180 }: LineChartProps) {
  const chartId = useId();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-[180px] flex items-center justify-center text-xs text-neutral-400">
        No conversation activity recorded in this period.
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.conversations), 10);

  // Compute nice Y-axis max
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
  const padTop = 22;
  const padBottom = 26;

  const plotWidth = svgWidth - padLeft - padRight;
  const plotHeight = svgHeight - padTop - padBottom;

  const stepX = data.length > 1 ? plotWidth / (data.length - 1) : plotWidth;

  // Build points array
  const points = data.map((d, idx) => {
    const x = padLeft + idx * stepX;
    const y = padTop + plotHeight - (d.conversations / yMax) * plotHeight;
    return { x, y, data: d };
  });

  // SVG Line path & Area path
  const linePathD = points.reduce((acc, pt, i) => {
    return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, "");

  const firstPt = points[0];
  const lastPt = points[points.length - 1];
  const baselineY = padTop + plotHeight;
  const areaPathD = `${linePathD} L ${lastPt.x} ${baselineY} L ${firstPt.x} ${baselineY} Z`;

  // Find Peak Annotation: highest daily point (earliest day if tie)
  let peakIdx = 0;
  let highestVal = -1;
  data.forEach((d, idx) => {
    if (d.conversations > highestVal) {
      highestVal = d.conversations;
      peakIdx = idx;
    }
  });
  const peakPoint = highestVal > 0 ? points[peakIdx] : null;

  // X ticks
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

  const activePoint = hoveredIdx !== null ? points[hoveredIdx] : null;

  return (
    <div className="relative w-full" onMouseLeave={() => setHoveredIdx(null)}>
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full h-auto sm:h-[180px] overflow-visible select-none"
        preserveAspectRatio="none"
        aria-label="Daily conversation volume line chart"
        role="img"
      >
        <title id={`${chartId}-title`}>New conversations per day</title>

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

        {/* Subtle orange area underneath */}
        <path d={areaPathD} fill="#fa5d19" fillOpacity="0.08" />

        {/* Orange line */}
        <path
          d={linePathD}
          fill="none"
          stroke="#fa5d19"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Peak Annotation dot & label */}
        {peakPoint && hoveredIdx === null && (
          <g>
            <circle
              cx={peakPoint.x}
              cy={peakPoint.y}
              r="3.5"
              fill="#fa5d19"
              stroke="#ffffff"
              strokeWidth="1.5"
            />
            <text
              x={peakPoint.x}
              y={peakPoint.y - 8}
              textAnchor={peakIdx < 3 ? "start" : peakIdx > data.length - 4 ? "end" : "middle"}
              className="fill-neutral-600 text-[9px] font-mono font-medium"
            >
              Peak: {formatCompactNumber(peakPoint.data.conversations)}
            </text>
          </g>
        )}

        {/* Interactive hover points & hit areas */}
        {points.map((pt, idx) => {
          const isHovered = hoveredIdx === idx;
          const hitWidth = Math.max(12, stepX);

          return (
            <g
              key={pt.data.date}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIdx(idx)}
              onFocus={() => setHoveredIdx(idx)}
              tabIndex={0}
              aria-label={`${pt.data.date}: ${pt.data.conversations} conversations`}
            >
              {/* Invisible hit box */}
              <rect
                x={pt.x - hitWidth / 2}
                y={padTop}
                width={hitWidth}
                height={plotHeight}
                fill="transparent"
              />

              {/* Vertical guideline on hover */}
              {isHovered && (
                <line
                  x1={pt.x}
                  y1={padTop}
                  x2={pt.x}
                  y2={baselineY}
                  stroke="#fa5d19"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                  opacity="0.6"
                />
              )}

              {/* Data point dot on hover */}
              {isHovered && (
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="4.5"
                  fill="#fa5d19"
                  stroke="#ffffff"
                  strokeWidth="2"
                />
              )}
            </g>
          );
        })}

        {/* X Axis ticks */}
        {xTickIndices.map((idx) => {
          const pt = points[idx];
          if (!pt) return null;
          return (
            <text
              key={pt.data.date}
              x={pt.x}
              y={svgHeight - 6}
              textAnchor="middle"
              className="fill-neutral-400 text-[10px] font-sans"
            >
              {formatUtcMonthDay(pt.data.date)}
            </text>
          );
        })}
      </svg>

      {/* Floating Tooltip */}
      {hoveredIdx !== null && activePoint && (
        <ChartTooltip
          x={(activePoint.x / svgWidth) * 100}
          y={(activePoint.y / svgHeight) * 100}
          title={formatUtcFullDate(activePoint.data.date)}
          items={[
            {
              label: "Conversations",
              value: formatExactNumber(activePoint.data.conversations),
              color: "#fa5d19",
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
