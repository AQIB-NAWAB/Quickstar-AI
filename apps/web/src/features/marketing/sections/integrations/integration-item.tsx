"use client";

import React from "react";
import { Plus } from "lucide-react";
import type { IntegrationItemData, DecorativePlusData } from "./content";
import { renderIntegrationLogo } from "./logos";

interface IntegrationItemProps {
  item: IntegrationItemData;
  onSelect: (item: IntegrationItemData, triggerEl: HTMLElement | null) => void;
  // Positioned mode: whether to apply absolute percentage positioning (for desktop scene)
  isPositioned?: boolean;
}

export function IntegrationItem({
  item,
  onSelect,
  isPositioned = false,
}: IntegrationItemProps) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onSelect(item, e.currentTarget);
  };

  const style: React.CSSProperties = isPositioned
    ? {
        left: `${(item.sceneX / 1440) * 100}%`,
        top: `${(item.sceneY / 570) * 100}%`,
      }
    : {};

  return (
    <div
      className={`marketing-integrations-item-wrapper ${
        isPositioned ? "marketing-integrations-item-absolute" : ""
      }`}
      style={style}
    >
      <button
        type="button"
        className={`marketing-integrations-medallion-btn ${
          item.hasAccentRing ? "marketing-integrations-medallion-accent" : ""
        }`}
        onClick={handleClick}
        aria-label={`View ${item.name} integration details`}
      >
        <span className="marketing-integrations-medallion-circle" aria-hidden="true">
          <span className="marketing-integrations-logo-container">
            {renderIntegrationLogo(item.id, 36, "marketing-integrations-logo-svg")}
          </span>
        </span>
        <span className="marketing-integrations-item-label">{item.name}</span>
      </button>
    </div>
  );
}

interface DecorativePlusProps {
  plus: DecorativePlusData;
}

export function DecorativePlusMedallion({ plus }: DecorativePlusProps) {
  const style: React.CSSProperties = {
    left: `${(plus.sceneX / 1440) * 100}%`,
    top: `${(plus.sceneY / 570) * 100}%`,
  };

  return (
    <div
      className="marketing-integrations-plus-wrapper"
      style={style}
      aria-hidden="true"
    >
      <span className="marketing-integrations-plus-circle">
        <Plus size={14} strokeWidth={2.5} className="marketing-integrations-plus-icon" />
      </span>
    </div>
  );
}
