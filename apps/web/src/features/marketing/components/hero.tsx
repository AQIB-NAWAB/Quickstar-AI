"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import "../styles/hero-journey.css";

const stages = ["Find a lead", "Start a conversation", "Take the next action"];

export function Hero() {
  const heroRef = useRef<HTMLElement>(null);
  const [demoTarget, setDemoTarget] = useState("#how-it-works");
  const [motionActive, setMotionActive] = useState(false);

  useEffect(() => {
    if (document.getElementById("demo")) setDemoTarget("#demo");
    const section = heroRef.current;
    if (!section) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let inView = false;
    const update = () => setMotionActive(inView && !document.hidden && !preference.matches);
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      update();
    }, { threshold: 0.1 });
    observer.observe(section);
    document.addEventListener("visibilitychange", update);
    preference.addEventListener("change", update);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
      preference.removeEventListener("change", update);
    };
  }, []);

  return (
    <section ref={heroRef} id="hero" className="journey-hero" aria-labelledby="journey-headline" data-motion={motionActive}>
      <div className="journey-intro">
        <p className="journey-eyebrow">AI AGENTS FOR YOUR BUSINESS</p>
        <h1 id="journey-headline"><span>AI agents that find, call,</span>{" "}<span>and <em>get work done.</em></span></h1>
        <p className="journey-description">One agent for your website, calls, and campaigns. Built around your business, with your team in control.</p>
        <div className="journey-actions">
          <Link href="/register" className="journey-button journey-primary">Start building<ArrowRight size={18} aria-hidden="true" /></Link>
          <a href={demoTarget} className="journey-button journey-secondary">See it in action<ArrowUpRight size={18} aria-hidden="true" /></a>
        </div>
      </div>
      <figure className="journey-figure">
        <div id="hero-illustration" className="journey-art">
          <span id="playground" className="journey-legacy-anchor" aria-hidden="true" />
          <Image
            src="/marketing/hero-roadmap/hero-journey-neutral-hd.webp"
            width={2172} height={724}
            sizes="(max-width: 599px) 100vw, (max-width: 1099px) 94vw, 1160px"
            priority unoptimized className="journey-art-image"
            alt="Illustrative workflow: an example business lead, a phone conversation, and a booked appointment connected by a shared pipeline."
          />
          {/* Decorative signals follow the artwork's existing conduits, not live activity. */}
          <svg className="journey-signals" viewBox="0 0 2048 683" fill="none" aria-hidden="true" focusable="false">
            <path className="journey-signal journey-signal-lead" pathLength="100" d="M650 302 C671 313 687 325 704 337" />
            <path className="journey-signal journey-signal-call" pathLength="100" d="M756 371 C775 383 790 391 809 397" />
            <path className="journey-signal journey-signal-booking" pathLength="100" d="M1393 336 L1461 287" />
            <g className="journey-phone-bars" stroke="#fa5d19" strokeWidth="5" strokeLinecap="round">
              <path className="journey-phone-bar" d="M973 434 L973 455" />
              <path className="journey-phone-bar" d="M997 410 L997 461" />
              <path className="journey-phone-bar" d="M1021 416 L1021 466" />
              <path className="journey-phone-bar" d="M1068 420 L1068 466" />
              <path className="journey-phone-bar" d="M1093 436 L1093 466" />
            </g>
            <circle className="journey-booking-check" cx="1697" cy="117" r="26" stroke="#fa5d19" strokeWidth="2" />
          </svg>
        </div>
        <figcaption className="journey-captions">
          {stages.map((label, index) => (
            <div key={label} className="journey-caption">
              <span className="journey-number">0{index + 1}</span>
              <span className="journey-caption-rule" aria-hidden="true" />
              <span>{label}</span>
            </div>
          ))}
        </figcaption>
      </figure>
    </section>
  );
}
