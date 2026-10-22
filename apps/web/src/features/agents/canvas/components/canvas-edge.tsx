"use client";

import React, { memo } from "react";
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from "@xyflow/react";

export const CanvasEdge: React.FC<EdgeProps> = memo(
  ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    selected,
    data,
    markerEnd,
  }) => {
    const [edgePath, labelX, labelY] = getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
      curvature: 0.25,
    });

    const isExecuting = Boolean((data as any)?.isExecuting);
    const label = (data as any)?.label;

    return (
      <>
        <BaseEdge
          id={id}
          path={edgePath}
          markerEnd={markerEnd}
          style={{
            stroke: selected ? "#FA5D19" : isExecuting ? "#F59E0B" : "#CBD5E1",
            strokeWidth: selected ? 2.5 : isExecuting ? 2.5 : 1.75,
            strokeDasharray: isExecuting ? "5,5" : undefined,
            transition: "stroke 0.2s, stroke-width 0.2s",
          }}
        />

        {label && (
          <EdgeLabelRenderer>
            <div
              style={{
                position: "absolute",
                transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                pointerEvents: "all",
              }}
              className="px-2 py-0.5 text-[10px] font-medium bg-white border border-neutral-200 text-neutral-600 rounded shadow-xs"
            >
              {label}
            </div>
          </EdgeLabelRenderer>
        )}
      </>
    );
  },
);

CanvasEdge.displayName = "CanvasEdge";
