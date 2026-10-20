"use client";

import { useId,useState } from "react";
import { formatExactNumber,formatSeconds,formatUtcFullDate,formatUtcMonthDay } from "../../lib/format";
import type { DailyLatencyPoint } from "../../lib/types";
import { ChartTooltip } from "./chart-tooltip";

interface LatencyLineChartProps {
  data: DailyLatencyPoint[];
  height?: number;
}

export function LatencyLineChart({ data, height = 180 }: LatencyLineChartProps) {
  const chartId = useId();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-[180px] flex items-center justify-center text-xs text-neutral-400">
        No latency measurements in this period.
      </div>
    );
  }

  // Find max latency in ms across both P50 and P95
  const validP95 = data.map((d) => d.p95Ms).filter((v): v is number => v !== null && v !== undefined);
  const maxMs = validP95.length > 0 ? Math.max(...validP95) : 5000;
  // Nice round max seconds
  const maxSec = Math.max(1, Math.ceil(maxMs / 1000));
  const yMaxMs = maxSec * 1000;

  const yTicksMs = [
    0,
    Math.round(yMaxMs * 0.33),
    Math.round(yMaxMs * 0.66),
    yMaxMs,
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

  const stepX = data.length > 1 ? plotWidth / (data.length - 1) : plotWidth;

  // Build segmented paths handling gaps when latency is null
  function buildPath(getValue: (d: DailyLatencyPoint) => number | null): string {
    let dStr = "";
    let inSegment = false;

    data.forEach((d, idx) => {
      const val = getValue(d);
      const x = padLeft + idx * stepX;

      if (val === null || val === undefined) {
        inSegment = false;
        return;
      }

      const y = padTop + plotHeight - (val / yMaxMs) * plotHeight;

      if (!inSegment) {
        dStr += ` M ${x} ${y}`;
        inSegment = true;
      } else {
        dStr += ` L ${x} ${y}`;
      }
    });

    return dStr.trim();
  }

  const p50PathD = buildPath((d) => d.p50Ms);
  const p95PathD = buildPath((d) => d.p95Ms);

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

  const activePoint = hoveredIdx !== null ? data[hoveredIdx] : null;

  return (
    <div className="relative w-full" onMouseLeave={() => setHoveredIdx(null)}>
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full h-auto sm:h-[180px] overflow-visible select-none"
        preserveAspectRatio="none"
        aria-label="Daily response latency percentiles chart"
        role="img"
      >
        <title id={`${chartId}-title`}>Daily response time percentiles</title>

        {/* Horizontal grid lines & Y labels in seconds */}
        {yTicksMs.map((tickMs, idx) => {
          const yPos = padTop + plotHeight - (tickMs / yMaxMs) * plotHeight;
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
                {tickMs === 0 ? "0 s" : formatSeconds(tickMs)}
              </text>
            </g>
          );
        })}

        {/* P95 Line (neutral-500, dashed) */}
        {p95PathD && (
          <path
            d={p95PathD}
            fill="none"
            stroke="#737373"
            strokeWidth="1.75"
            
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* P50 Line (orange-500, solid) */}
        {p50PathD && (
          <path
            d={p50PathD}
            fill="none"
            stroke="#fa5d19"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Interactive hit areas & hover dots */}
        {data.map((d, idx) => {
          const x = padLeft + idx * stepX;
          const hitWidth = Math.max(12, stepX);
          const isHovered = hoveredIdx === idx;

          const p50Y =
            d.p50Ms !== null
              ? padTop + plotHeight - (d.p50Ms / yMaxMs) * plotHeight
              : null;
          const p95Y =
            d.p95Ms !== null
              ? padTop + plotHeight - (d.p95Ms / yMaxMs) * plotHeight
              : null;

          return (
            <g
              key={d.date}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIdx(idx)}
              onFocus={() => setHoveredIdx(idx)}
              tabIndex={0}
              aria-label={`${d.date}: P50 ${formatSeconds(d.p50Ms)}, P95 ${formatSeconds(d.p95Ms)}`}
            >
              {/* Hit target */}
              <rect
                x={x - hitWidth / 2}
                y={padTop}
                width={hitWidth}
                height={plotHeight}
                fill="transparent"
              />

              {/* Vertical guideline */}
              {isHovered && (
                <line
                  x1={x}
                  y1={padTop}
                  x2={x}
                  y2={padTop + plotHeight}
                  stroke="#737373"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                  opacity="0.5"
                />
              )}

              {/* P95 hover dot */}
              {isHovered && p95Y !== null && (
                <circle
                  cx={x}
                  cy={p95Y}
                  r="4"
                  fill="#737373"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
              )}

              {/* P50 hover dot */}
              {isHovered && p50Y !== null && (
                <circle
                  cx={x}
                  cy={p50Y}
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
          const d = data[idx];
          if (!d) return null;
          const x = padLeft + idx * stepX;
          return (
            <text
              key={d.date}
              x={x}
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
          x={((padLeft + hoveredIdx * stepX) / svgWidth) * 100}
          y={
            activePoint.p95Ms !== null
              ? ((padTop + plotHeight - (activePoint.p95Ms / yMaxMs) * plotHeight) /
                  svgHeight) *
                100
              : 50
          }
          title={formatUtcFullDate(activePoint.date)}
          items={[
            {
              label: "P50 (median)",
              value: formatSeconds(activePoint.p50Ms),
              color: "#fa5d19",
            },
            {
              label: "P95 (95th)",
              value: formatSeconds(activePoint.p95Ms),
              color: "#737373",
              dashed: true,
            },
            ...(activePoint.sampleCount !== null && activePoint.sampleCount !== undefined
              ? [
                  {
                    label: "Turns",
                    value: formatExactNumber(activePoint.sampleCount),
                  },
                ]
              : []),
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
