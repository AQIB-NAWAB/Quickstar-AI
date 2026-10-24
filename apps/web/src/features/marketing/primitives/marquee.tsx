"use client";

import React, { ReactNode } from "react";

interface MarqueeProps {
  children: ReactNode;
  isPaused?: boolean;
  isAnimated?: boolean;
  className?: string;
  viewportClassName?: string;
}

/**
 * Reusable Marquee primitive.
 * Renders a primary semantic track and a duplicate track with aria-hidden="true"
 * for an unbroken right-to-left linear loop.
 */
export function Marquee({
  children,
  isPaused = false,
  isAnimated = true,
  className = "",
  viewportClassName = "",
}: MarqueeProps) {
  return (
    <div className={`built-on-viewport ${viewportClassName}`} role="region" aria-label="Technology wordmarks">
      <div
        className={`built-on-track ${className}`}
        data-animated={isAnimated ? "true" : "false"}
        data-paused={isPaused ? "true" : "false"}
      >
        {/* Primary semantic list for screen readers and visible flow */}
        <ul className="built-on-group" role="list">
          {React.Children.map(children, (child, idx) => (
            <li key={`primary-${idx}`} role="listitem" className="list-none m-0 p-0">
              {child}
            </li>
          ))}
        </ul>

        {/* Duplicate group for continuous visual looping only, hidden from assistive tech */}
        <div className="built-on-group built-on-duplicate" aria-hidden="true">
          {React.Children.map(children, (child, idx) => (
            <div key={`duplicate-${idx}`} role="presentation">
              {React.isValidElement<{ tabIndex?: number }>(child)
                ? React.cloneElement(child, { tabIndex: -1 })
                : child}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
