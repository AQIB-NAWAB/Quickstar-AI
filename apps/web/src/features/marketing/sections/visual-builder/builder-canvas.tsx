"use client";

import React, { useRef, useEffect } from "react";
import type {
  BuilderTemplateData,
} from "../../content/builder-graph";
import { BuilderNode } from "./builder-node";

interface TokenPosition {
  x: number;
  y: number;
  visible: boolean;
}

interface BuilderCanvasProps {
  template: BuilderTemplateData;
  selectedNodeId: string;
  highlightedNodeId: string | null;
  activeConnectionIds: string[];
  tokenPos: TokenPosition;
  traversalPath?: string;
  isPlaying: boolean;
  onSelectNode: (nodeId: string) => void;
}

export function BuilderCanvas({
  template,
  selectedNodeId,
  highlightedNodeId,
  activeConnectionIds,
  tokenPos,
  traversalPath,
  isPlaying,
  onSelectNode,
}: BuilderCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const motionRef = useRef<SVGAnimateMotionElement>(null);
  useEffect(() => {
    if (traversalPath) motionRef.current?.beginElement();
  }, [traversalPath]);
  useEffect(() => {
    if (isPlaying) svgRef.current?.unpauseAnimations();
    else svgRef.current?.pauseAnimations();
  }, [isPlaying]);

  useEffect(() => {
    const viewport = containerRef.current;
    if (!viewport) return;
    const showSelection = () => {
      const selected = template.nodes.find((node) => node.id === selectedNodeId);
      if (!selected) return;
      viewport.scrollLeft = viewport.clientWidth >= template.viewBox.width
        ? 0
        : Math.max(0, selected.x + selected.width / 2 - viewport.clientWidth / 2);
    };
    showSelection();
    const observer = new ResizeObserver(showSelection);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [template, selectedNodeId]);

  return (
    <div
      ref={containerRef}
      className="marketing-builder-canvas-viewport"
      tabIndex={0}
      role="region"
      onKeyDown={(event) => {
        const target = event.target as HTMLElement;
        const id = target.closest<HTMLElement>("[data-builder-node-id]")?.dataset.builderNodeId;
        if (!id || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
        const index = template.nodes.findIndex((node) => node.id === id);
        let next = template.nodes[index];
        if (event.key === "ArrowRight") next = template.nodes[(index + 1) % template.nodes.length];
        if (event.key === "ArrowLeft") next = template.nodes[(index - 1 + template.nodes.length) % template.nodes.length];
        if (event.key === "ArrowDown") next = template.nodes.find((node) => node.type === "handoff")!;
        if (event.key === "ArrowUp") next = template.nodes.find((node) => node.type === "condition")!;
        event.preventDefault();
        containerRef.current?.querySelector<HTMLButtonElement>(`[data-builder-node-id="${next.id}"]`)?.focus({ preventScroll: true });
      }}
      aria-label="Workflow canvas. Use Tab or arrow keys to navigate steps, or scroll horizontally on mobile."
    >
      <div
        className="marketing-builder-canvas-surface"
        style={{
          width: "100%",
          minWidth: `${template.viewBox.width}px`,
          height: "100%",
        }}
      >
        {/* Inline SVG connections layer */}
        <svg
          ref={svgRef}
          className="marketing-builder-svg-layer"
          viewBox={`0 0 ${template.viewBox.width} ${template.viewBox.height}`}
          width="100%"
          height="100%"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <marker
              id="marketing-builder-arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#b0b0b0" />
            </marker>
            <marker
              id="marketing-builder-arrow-active"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#fa5d19" />
            </marker>
          </defs>

          {/* Render connections */}
          {template.connections.map((conn) => {
            const isActive = activeConnectionIds.includes(conn.id);
            return (
              <g key={conn.id} className="marketing-builder-connection-group">
                <path
                  d={conn.pathD}
                  className={`marketing-builder-connection-line ${
                    isActive ? "marketing-builder-connection-active" : ""
                  }`}
                  markerEnd={
                    isActive
                      ? "url(#marketing-builder-arrow-active)"
                      : "url(#marketing-builder-arrow)"
                  }
                />
                {conn.label && conn.labelPosition && (
                  <text
                    x={conn.labelPosition.x}
                    y={conn.labelPosition.y}
                    textAnchor={conn.label === "Yes" ? "middle" : "start"}
                    className="marketing-builder-connection-label"
                  >
                    {conn.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Animated Traversal Bead / Orange Token */}
          {tokenPos.visible && (
            <g key={traversalPath || "resting"} className="marketing-builder-token-group">
              <circle cx={traversalPath ? 0 : tokenPos.x} cy={traversalPath ? 0 : tokenPos.y} r={4} className="marketing-builder-token" />
              {traversalPath && <animateMotion ref={motionRef} begin="indefinite" path={traversalPath} dur="620ms" fill="freeze" />}
            </g>
          )}
        </svg>

        {/* HTML Interactive Nodes */}
        <div className="marketing-builder-nodes-layer">
          {template.nodes.map((node) => (
            <BuilderNode
              key={node.id}
              node={node}
              graphHeight={template.viewBox.height}
              graphWidth={template.viewBox.width}
              isSelected={node.id === selectedNodeId}
              isHighlighted={node.id === highlightedNodeId}
              onSelect={onSelectNode}
            />
          ))}
        </div>

        {/* Quiet Helper text at bottom-left */}
        <div className="marketing-builder-canvas-helper" aria-hidden="true">
          Click a step to inspect it
        </div>
      </div>
    </div>
  );
}
