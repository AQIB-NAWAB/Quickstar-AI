"use client";

import React from "react";
import {
  MessageSquare,
  FileText,
  Link2,
  Diamond,
  User,
  Database,
} from "lucide-react";
import type { BuilderNodeData } from "../../content/builder-graph";

interface BuilderNodeProps {
  node: BuilderNodeData;
  graphHeight: number;
  graphWidth: number;
  isSelected: boolean;
  isHighlighted: boolean;
  onSelect: (nodeId: string) => void;
}

export function BuilderNode({
  node,
  graphHeight,
  graphWidth,
  isSelected,
  isHighlighted,
  onSelect,
}: BuilderNodeProps) {
  const renderIcon = () => {
    if (node.statusDot === "green") {
      return (
        <span
          className="marketing-builder-node-status-dot marketing-builder-node-status-green"
          aria-hidden="true"
        />
      );
    }
    if (node.statusDot === "red") {
      return (
        <span
          className="marketing-builder-node-status-dot marketing-builder-node-status-red"
          aria-hidden="true"
        />
      );
    }

    const iconClasses = `marketing-builder-node-icon ${
      isSelected ? "marketing-builder-node-icon-selected" : ""
    }`;

    switch (node.type) {
      case "message":
        return <MessageSquare className={iconClasses} aria-hidden="true" />;
      case "form":
        return <FileText className={iconClasses} aria-hidden="true" />;
      case "http_request":
        return <Link2 className={iconClasses} aria-hidden="true" />;
      case "condition":
        return <Diamond className={iconClasses} aria-hidden="true" />;
      case "response":
        return <FileText className={iconClasses} aria-hidden="true" />;
      case "handoff":
        return <User className={iconClasses} aria-hidden="true" />;
      case "knowledge_search":
        return <Database className={iconClasses} aria-hidden="true" />;
      default:
        return null;
    }
  };

  return (
    <button
      type="button"
      data-builder-node-id={node.id}
      onClick={() => onSelect(node.id)}
      onFocus={(event) => {
        const viewport = event.currentTarget.closest<HTMLElement>(".marketing-builder-canvas-viewport");
        if (!viewport) return;
        const button = event.currentTarget.getBoundingClientRect();
        const bounds = viewport.getBoundingClientRect();
        if (button.right > bounds.right) viewport.scrollLeft += button.right - bounds.right + 12;
        else if (button.left < bounds.left) viewport.scrollLeft -= bounds.left - button.left + 12;
      }}
      aria-pressed={isSelected}
      aria-label={`${node.title}, ${node.typeLabel} node`}
      className={`marketing-builder-node ${
        isSelected ? "marketing-builder-node-selected" : ""
      } ${isHighlighted ? "marketing-builder-node-highlighted" : ""}`}
      style={{
        left: `${node.x / graphWidth * 100}%`,
        top: `${node.y / graphHeight * 100}%`,
        width: `${node.width / graphWidth * 100}%`,
        height: `${node.height / graphHeight * 100}%`,
      }}
    >
      <div className="marketing-builder-node-top">
        {renderIcon()}
      </div>
      <div className="marketing-builder-node-copy">
        <span className="marketing-builder-node-type-label">
          {node.typeLabel}
        </span>
        <div className="marketing-builder-node-title" title={node.title}>
          {node.title}
        </div>
      </div>
    </button>
  );
}
