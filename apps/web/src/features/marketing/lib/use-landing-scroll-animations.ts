"use client";

import { useLayoutEffect, type RefObject } from "react";

// Motion values copied from design/boty-e-commerce-template:
// globals.css blur-in; FeatureSection/CTABanner scale reveal;
// ProductGrid 80ms stagger; TrustBadges 32px rise with 150ms stagger.
const headerSelector = [
  ".channels-header-block", ".demo-header-block", ".hiw-header-block",
  ".lead-research-header", ".marketing-builder-header", ".marketing-handoff-header",
  ".marketing-knowledge-header", ".marketing-rehearsal-header",
  ".marketing-developers-header", ".marketing-security-header",
  ".marketing-scale-header", ".marketing-integrations-header",
  ".marketing-use-cases-header", ".marketing-pricing-header",
].join(",");

const panelSelector = [
  ".demo-panel", ".hiw-journey-grid", ".hiw-desktop-layout", ".hiw-mobile-accordion",
  ".lead-research-stage", ".marketing-builder-frame", ".marketing-handoff-scene",
  ".marketing-knowledge-scene", ".marketing-rehearsal-experience",
  ".marketing-developers-panel", ".marketing-security-scene",
  ".marketing-scale-timeline-wrapper", ".marketing-integrations-scene-wrapper",
  ".marketing-faq-panel", ".marketing-final-cta-panel",
].join(",");

type Reveal = "blur" | "scale" | "rise";

export function useLandingScrollAnimations(rootRef: RefObject<HTMLDivElement>) {
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === "undefined") return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (preference.matches) return;

    const pending = new Map<Element, Animation[]>();
    const animations = new Set<Animation>();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        pending.get(entry.target)?.forEach((animation) => animation.play());
        pending.delete(entry.target);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.1 });

    function prepare(trigger: Element, element: HTMLElement, reveal: Reveal, delay = 0, duration = 700) {
      // Individual translate/scale preserve existing transforms and illustration geometry.
      const from: Keyframe = reveal === "blur"
        ? { opacity: 0, filter: "blur(12px)", translate: "0 10px" }
        : reveal === "rise"
          ? { opacity: 0, translate: "0 32px" }
          : { opacity: 0, scale: "0.95" };
      const to: Keyframe = reveal === "blur"
        ? { opacity: 1, filter: "blur(0px)", translate: "0 0" }
        : reveal === "rise"
          ? { opacity: 1, translate: "0 0" }
          : { opacity: 1, scale: "1" };
      const animation = element.animate([from, to], {
        duration, delay,
        easing: reveal === "blur" ? "ease-out" : "cubic-bezier(0, 0, 0.2, 1)",
        fill: "both",
      });
      animation.pause();
      animation.currentTime = 0;
      animations.add(animation);
      animation.onfinish = () => {
        // Release animation styles so hover, dialogs and local demos retain control.
        animation.cancel();
        animations.delete(animation);
      };
      pending.set(trigger, [...(pending.get(trigger) ?? []), animation]);
      observer.observe(trigger);
    }

    root.querySelectorAll<HTMLElement>(headerSelector).forEach((header) => {
      const heading = header.querySelector<HTMLElement>("h2");
      if (!heading) return;
      // The voice header has two columns; other headers have direct children.
      const copy = heading.parentElement === header ? header : heading.parentElement!;
      Array.from(copy.children).forEach((child, index) => {
        if (child instanceof HTMLElement) prepare(header, child, "blur", (index + 1) * 200, 800);
      });
    });

    root.querySelectorAll<HTMLElement>(panelSelector).forEach((panel) => prepare(panel, panel, "scale"));

    root.querySelectorAll<HTMLElement>(".channels-grid, .marketing-use-cases-grid, .marketing-pricing-grid").forEach((grid) => {
      Array.from(grid.children).forEach((card, index) => {
        if (card instanceof HTMLElement) prepare(grid, card, "scale", index * (grid.matches(".channels-grid") ? 100 : 80), grid.matches(".channels-grid") ? 700 : 500);
      });
    });

    root.querySelectorAll<HTMLElement>(".marketing-builder-supporting-strip").forEach((row) => {
      Array.from(row.children).forEach((item, index) => {
        if (item instanceof HTMLElement) prepare(row, item, "rise", index * 150);
      });
    });

    // How-it-works swaps its desktop layout for an accordion after hydration.
    const mobileLayouts = new WeakSet<Element>();
    root.querySelectorAll(".hiw-mobile-accordion").forEach((element) => mobileLayouts.add(element));
    const layouts = new MutationObserver(() => {
      if (preference.matches) return;
      root.querySelectorAll<HTMLElement>(".hiw-mobile-accordion").forEach((element) => {
        if (mobileLayouts.has(element)) return;
        mobileLayouts.add(element);
        prepare(element, element, "scale");
      });
    });
    const howItWorks = root.querySelector(".hiw-container");
    if (howItWorks) layouts.observe(howItWorks, { childList: true });

    // Keyboard navigation must never land on an invisible control during a reveal.
    const revealFocused = (event: FocusEvent) => {
      if (!(event.target instanceof Element)) return;
      const focused = event.target;
      animations.forEach((animation) => {
        const element = (animation.effect as KeyframeEffect | null)?.target;
        if (element instanceof Element && element.contains(focused)) {
          animation.cancel();
          animations.delete(animation);
        }
      });
    };
    const stopMotion = () => {
      if (!preference.matches) return;
      observer.disconnect();
      animations.forEach((animation) => animation.cancel());
      animations.clear();
      pending.clear();
    };
    root.addEventListener("focusin", revealFocused);
    preference.addEventListener("change", stopMotion);
    return () => {
      observer.disconnect();
      layouts.disconnect();
      animations.forEach((animation) => animation.cancel());
      root.removeEventListener("focusin", revealFocused);
      preference.removeEventListener("change", stopMotion);
    };
  }, [rootRef]);
}
