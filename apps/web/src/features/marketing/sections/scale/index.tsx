"use client";


import { CallTimeline } from "./call-timeline";
import "../../styles/scale.css";

export function ScaleSection() {



  return (
    <section

      id="scale"
      aria-labelledby="scale-heading"
      className="marketing-scale-section"
    >
      <div className="marketing-scale-container">
        {/* Header Block */}
        <header className="marketing-scale-header">
          {/* Eyebrow */}
          <div className="marketing-scale-eyebrow">
            <span>BUILT TO SCALE</span>
          </div>

          {/* Centered two-line Heading */}
          <h2 id="scale-heading" className="marketing-scale-title">
            <span className="marketing-scale-title-line">One busy hour.</span>
            <em className="marketing-scale-title-line">Every caller answered.</em>
          </h2>

          {/* Description */}
          <p className="marketing-scale-description">
            Keep conversations moving as your business grows.
          </p>
        </header>

        {/* Timeline Visual Presentation */}
        <div className="marketing-scale-timeline-wrapper">
          <CallTimeline />
        </div>

      </div>
    </section>
  );
}
