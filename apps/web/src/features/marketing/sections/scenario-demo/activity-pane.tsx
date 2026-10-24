"use client";

import React from "react";
import type { ActivityStep } from "../../content/demo-scenarios";

interface ActivityPaneProps {
  title: string;
  subtitle: string;
  steps: ActivityStep[];
  currentStepIndex: number;
  isComplete: boolean;
  isPlaying: boolean;
}

export function ActivityPane({
  title,
  subtitle,
  steps,
  currentStepIndex,
  isComplete,
  isPlaying,
}: ActivityPaneProps) {
  const total = steps.length;

  return (
    <div className="demo-activity-pane">
      <div className="demo-activity-header">
        <h3 className="demo-activity-title">{title}</h3>
        <p className="demo-activity-subtitle">{subtitle}</p>
      </div>

      <div className="demo-activity-list" aria-label="Agent execution steps">
        {steps.map((step, idx) => {
          const isFinalStep = idx === total - 1;
          const isStepCompleted = isComplete || idx < currentStepIndex;
          const isStepActive = isPlaying && idx === currentStepIndex && !isComplete;

          // Determine circle styling
          let circleClass = "demo-circle-pending";
          if (isStepCompleted) {
            circleClass = isFinalStep
              ? "demo-circle-completed-final"
              : "demo-circle-completed-intermediate";
          } else if (isStepActive) {
            circleClass = "demo-circle-active";
          }

          return (
            <div key={step.id} className="demo-activity-row">
              <div className={`demo-step-circle ${circleClass}`} aria-hidden="true">
                {isStepCompleted ? (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : isStepActive ? (
                  <span className="demo-active-dot" />
                ) : null}
              </div>

              <div className="demo-step-content">
                <span className="demo-step-label">{step.label}</span>
                {step.secondary && (
                  <span className="demo-step-secondary" style={{ visibility: isStepCompleted || isStepActive ? "visible" : "hidden" }}>{step.secondary}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
