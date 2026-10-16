"use client";

import type { KeyboardEvent } from "react";
import { WORKSTATION_SVG } from "./workstation-svg";
import { useIllustrationMotion } from "./use-illustration-motion";

const DRAWER_OFFSETS: Record<string, [number, number]> = {
  drawer: [-16.2041472272349, 8.42444972787473],
};

export function WorkstationIllustration() {
  const { containerRef, active, toggle, setExplicit } = useIllustrationMotion({
    offsets: DRAWER_OFFSETS,
  });

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (["Enter", " "].includes(e.key)) {
      e.preventDefault();
      toggle();
    } else if (["ArrowRight"].includes(e.key)) {
      e.preventDefault();
      setExplicit(true);
    } else if (["ArrowLeft", "Escape", "Home"].includes(e.key)) {
      e.preventDefault();
      setExplicit(false);
    }
  };

  return (
    <>
      <div
        ref={containerRef}
        className="auth-art-wrap iso"
        data-theme="light"
        tabIndex={0}
        role="button"
        aria-label="Original business workspace illustration. Press to toggle desk drawer."
        aria-pressed={active}
        onClick={toggle}
        onKeyDown={handleKeyDown}
        dangerouslySetInnerHTML={{ __html: WORKSTATION_SVG }}
      />
      <span className="auth-sr-only" aria-live="polite">
        {active ? "Drawer open" : "Drawer closed"}
      </span>
    </>
  );
}
