"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { USE_CASES_CONTENT } from "./content";
import { RequestExample } from "./request-example";
import "../../styles/use-cases.css";

export function UseCasesSection() {
  const sectionRef = useRef<HTMLElement>(null);

  // Viewport tracking observer for entry animation & status
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          section.dataset.inView = "true";
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(section);
    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="use-cases"
      aria-labelledby="use-cases-heading"
      className="marketing-use-cases-section"
    >
      <div className="marketing-use-cases-container">
        {/* Left-Aligned Header */}
        <header className="marketing-use-cases-header">
          <p className="marketing-use-cases-eyebrow">Everyday jobs</p>
          <h2 id="use-cases-heading" className="marketing-use-cases-title">Real requests. <em>Useful work.</em></h2>
          <p className="marketing-use-cases-description">Give your agent the jobs your customers already ask for.</p>
        </header>

        {/* Two-Column Grid of 6 Customer Requests */}
        <div
          className="marketing-use-cases-grid"
          role="region"
          aria-label="Customer request use cases"
        >
          {USE_CASES_CONTENT.examples.map((example, idx) => (
            <RequestExample
              key={example.id}
              example={example}
              index={idx}
            />
          ))}
        </div>

        {/* Centered Primary CTA */}
        <div className="marketing-use-cases-cta-wrapper">
          <Link
            href={USE_CASES_CONTENT.ctaHref}
            className="marketing-use-cases-primary-cta"
            aria-label={`${USE_CASES_CONTENT.ctaText} — Create an account`}
          >
            <span>{USE_CASES_CONTENT.ctaText}</span>
            <ArrowRight
              className="marketing-use-cases-cta-arrow"
              size={18}
              strokeWidth={2.2}
              aria-hidden="true"
            />
          </Link>
        </div>
      </div>
    </section>
  );
}
