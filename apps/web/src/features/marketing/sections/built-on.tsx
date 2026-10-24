"use client";

import React, { useEffect, useRef, useState, type CSSProperties } from "react";
import { BUILT_ON_PROVIDERS } from "../content/integrations";
import { Marquee } from "../primitives/marquee";
import "../styles/built-on.css";

export function BuiltOnSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [isDocVisible, setIsDocVisible] = useState(true);
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [isLogoHovered, setIsLogoHovered] = useState(false);
  const [isFocusWithin, setIsFocusWithin] = useState(false);

  useEffect(() => {
    // Document visibility listener
    const handleVisibilityChange = () => {
      setIsDocVisible(!document.hidden);
    };
    setIsDocVisible(!document.hidden);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Prefers-reduced-motion media query listener
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setIsReducedMotion(motionQuery.matches);
    const handleMotionChange = () => {
      setIsReducedMotion(motionQuery.matches);
    };
    motionQuery.addEventListener("change", handleMotionChange);

    // Viewport IntersectionObserver (pause offscreen)
    let observer: IntersectionObserver | null = null;
    const currentSection = sectionRef.current;
    if (currentSection && typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[entries.length - 1];
          if (entry) {
            setIsIntersecting(entry.isIntersecting && entry.intersectionRatio >= 0.25);
          }
        },
        { threshold: 0.25 }
      );
      observer.observe(currentSection);
    }

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      motionQuery.removeEventListener("change", handleMotionChange);
      if (observer) {
        observer.disconnect();
      }
    };
  }, []);

  // Motion is paused when ANY pause condition is active
  const isPaused =
    !isIntersecting ||
    !isDocVisible ||
    isReducedMotion ||
    isLogoHovered ||
    isFocusWithin;

  return (
    <section
      ref={sectionRef}
      id="built-on"
      aria-labelledby="built-on-heading"
      className="built-on-strip select-none"
      data-animated={!isReducedMotion}
      onFocusCapture={() => setIsFocusWithin(true)}
      onBlurCapture={(e) => {
        if (!sectionRef.current?.contains(e.relatedTarget as Node)) {
          setIsFocusWithin(false);
        }
      }}
    >
      <div className="built-on-container">
        <div className="built-on-heading-row">
          <h2 id="built-on-heading" className="built-on-title">
            Built on the tools you already know.
          </h2>
        </div>

        {/* Marquee Viewport with Providers */}
        <Marquee
          isPaused={isPaused}
          isAnimated={!isReducedMotion}
        >
          {BUILT_ON_PROVIDERS.map((provider) => (
            <span
              key={provider.name}
              data-provider={provider.name}
              className="built-on-item"
              role="img"
              aria-label={provider.name}
              tabIndex={0}
              onPointerEnter={(event) => { if (event.pointerType !== "touch") setIsLogoHovered(true); }}
              onPointerLeave={() => setIsLogoHovered(false)}
              onPointerCancel={() => setIsLogoHovered(false)}
              style={{ "--provider-logo": `url("/marketing/integrations/${provider.logo}.svg")` } as CSSProperties}
            >
              <span className="built-on-logo" aria-hidden="true" />
              <span className="built-on-provider-name" aria-hidden="true">{provider.name}</span>
            </span>
          ))}
        </Marquee>
      </div>
    </section>
  );
}
