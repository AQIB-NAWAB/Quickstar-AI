"use client";

import { useId, useState } from "react";
import { formatCompactNumber, formatUtcFullDate, formatUtcMonthDay } from "../../lib/format";
import type { DailyLatencyPoint } from "../../lib/types";
import { ChartTooltip } from "./chart-tooltip";

interface LatencyConcurrencyChartProps {
  data: DailyLatencyPoint[];
  height?: number;
}

export function LatencyConcurrencyChart({
  data,
  height = 180,
}: LatencyConcurrencyChartProps) {
  const chartId = useId();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-[180px] flex items-center justify-center text-xs text-neutral-400">
        No latency or concurrency measurements in this period.
      </div>
    );
  }

  // Left axis: Latency in ms (P50 or median)
  const validLatency = data
    .map((d) => d.p50Ms)
    .filter((v): v is number => v !== null && v !== undefined);
  const maxLatency = validLatency.length > 0 ? Math.max(...validLatency) : 1000;
  // Round to nearest 500ms
  const yMaxLatency = Math.max(500, Math.ceil(maxLatency / 500) * 500);

  // Right axis: Concurrent turns
  const validConcurrency = data.map((d) => d.concurrentTurns ?? 0);
  const maxConcurrency = Math.max(...validConcurrency, 10);
  // Round to nearest 50 or 100
  const yMaxConcurrency = Math.max(100, Math.ceil(maxConcurrency / 100) * 100);

  const yTicksLatency = [
    0,
    Math.round(yMaxLatency * 0.25),
    Math.round(yMaxLatency * 0.5),
    Math.round(yMaxLatency * 0.75),
    yMaxLatency,
  ];

  const yTicksConcurrency = [
    0,
    Math.round(yMaxConcurrency * 0.25),
    Math.round(yMaxConcurrency * 0.5),
    Math.round(yMaxConcurrency * 0.75),
    yMaxConcurrency,
  ];

  const svgWidth = 520;
  const svgHeight = height;
  const padLeft = 44;
  const padRight = 44;
  const padTop = 16;
  const padBottom = 26;

  const plotWidth = svgWidth - padLeft - padRight;
  const plotHeight = svgHeight - padTop - padBottom;

  const stepX = data.length > 1 ? plotWidth / (data.length - 1) : plotWidth;

  // Build Latency path (Slate line)
  let latencyPathD = "";
  let latencySegment = false;
  data.forEach((d, idx) => {
    const val = d.p50Ms;
    const x = padLeft + idx * stepX;
    if (val === null || val === undefined) {
      latencySegment = false;
      return;
    }
    const y = padTop + plotHeight - (val / yMaxLatency) * plotHeight;
    if (!latencySegment) {
      latencyPathD += ` M ${x} ${y}`;
      latencySegment = true;
    } else {
      latencyPathD += ` L ${x} ${y}`;
    }
  });

  // Build Concurrency path (Orange line)
  let concurrencyPathD = "";
  let concurrencySegment = false;
  data.forEach((d, idx) => {
    const val = d.concurrentTurns ?? 0;
    const x = padLeft + idx * stepX;
    const y = padTop + plotHeight - (val / yMaxConcurrency) * plotHeight;
    if (!concurrencySegment) {
      concurrencyPathD += ` M ${x} ${y}`;
      concurrencySegment = true;
    } else {
      concurrencyPathD += ` L ${x} ${y}`;
    }
  });

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
        aria-label="Latency and concurrency trend chart"
        role="img"
      >
        <title id={`${chartId}-title`}>Latency and concurrency trends</title>

        {/* Horizontal grid lines & Y labels */}
        {yTicksLatency.map((tickLatency, idx) => {
          const yPos = padTop + plotHeight - (idx / 4) * plotHeight;
          const tickConcurrency = yTicksConcurrency[idx];
          return (
            <g key={idx}>
              <line
                x1={padLeft}
                y1={yPos}
                x2={svgWidth - padRight}
                y2={yPos}
                stroke="#EAECF0"
                strokeWidth="1"
              />
              {/* Left Y label (Latency ms) */}
              <text
                x={padLeft - 6}
                y={yPos + 3.5}
                textAnchor="end"
                className="fill-neutral-400 text-[10px] font-mono tabular-nums"
              >
                {tickLatency.toLocaleString()}
              </text>
              {/* Right Y label (Concurrent turns) */}
              <text
                x={svgWidth - padRight + 6}
                y={yPos + 3.5}
                textAnchor="start"
                className="fill-neutral-400 text-[10px] font-mono tabular-nums"
              >
                {tickConcurrency.toLocaleString()}
              </text>
            </g>
          );
        })}

        {/* Latency line (Slate) */}
        {latencyPathD && (
          <path
            d={latencyPathD.trim()}
            fill="none"
            stroke="#64748B"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Concurrency line (Orange) */}
        {concurrencyPathD && (
          <path
            d={concurrencyPathD.trim()}
            fill="none"
            stroke="#FF571A"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Dots on data points */}
        {data.map((d, idx) => {
          const x = padLeft + idx * stepX;
          const latVal = d.p50Ms;
          const latY = latVal !== null ? padTop + plotHeight - (latVal / yMaxLatency) * plotHeight : null;
          const concVal = d.concurrentTurns ?? 0;
          const concY = padTop + plotHeight - (concVal / yMaxConcurrency) * plotHeight;

          return (
            <g key={d.date}>
              {latY !== null && (
                <circle
                  cx={x}
                  cy={latY}
                  r="3.5"
                  fill="#FFFFFF"
                  stroke="#64748B"
                  strokeWidth="2"
                />
              )}
              <circle
                cx={x}
                cy={concY}
                r="3.5"
                fill="#FFFFFF"
                stroke="#FF571A"
                strokeWidth="2"
              />
            </g>
          );
        })}

        {/* Interactive hit areas */}
        {data.map((d, idx) => {
          const x = padLeft + idx * stepX;
          const hitWidth = Math.max(14, stepX);
          const isHovered = hoveredIdx === idx;

          return (
            <g
              key={d.date}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIdx(idx)}
              onFocus={() => setHoveredIdx(idx)}
              tabIndex={0}
              aria-label={`${d.date}: Latency ${d.p50Ms ?? "—"} ms, Concurrency ${d.concurrentTurns ?? 0}`}
            >
              <rect
                x={x - hitWidth / 2}
                y={padTop}
                width={hitWidth}
                height={plotHeight}
                fill="transparent"
              />
              {isHovered && (
                <line
                  x1={x}
                  y1={padTop}
                  x2={x}
                  y2={padTop + plotHeight}
                  stroke="#71717A"
                  strokeWidth="1"
                  strokeDasharray="2 2"
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

      {/* Hover Tooltip */}
      {hoveredIdx !== null && activePoint && (
        <ChartTooltip
          x={((padLeft + hoveredIdx * stepX) / svgWidth) * 100}
          y={30}
          title={formatUtcFullDate(activePoint.date)}
          items={[
            {
              label: "Latency (ms)",
              value: activePoint.p50Ms !== null ? `${activePoint.p50Ms} ms` : "—",
              color: "#64748B",
            },
            {
              label: "Concurrent turns",
              value: formatCompactNumber(activePoint.concurrentTurns ?? 0),
              color: "#FF571A",
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
