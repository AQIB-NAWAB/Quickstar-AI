"use client";

import type { KeyboardEvent } from "react";
import { LOCKER_SVG } from "./locker-svg";
import { useIllustrationMotion } from "./use-illustration-motion";

const LOCKER_OFFSETS: Record<string, [number, number]> = {};

export function LockerIllustration() {
  const { containerRef, active, toggle, setExplicit } = useIllustrationMotion({
    offsets: LOCKER_OFFSETS,
    isLocker: true,
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
        aria-label="Original access safe illustration. Press to toggle lock indicator. The door remains closed."
        aria-pressed={active}
        onClick={toggle}
        onKeyDown={handleKeyDown}
        dangerouslySetInnerHTML={{ __html: LOCKER_SVG }}
      />
      <span className="auth-sr-only" aria-live="polite">
        {active ? "Access ready" : "Key resting"}
      </span>
    </>
  );
}
