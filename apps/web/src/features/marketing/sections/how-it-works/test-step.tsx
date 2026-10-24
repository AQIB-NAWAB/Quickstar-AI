"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Check, FileText, Play, RotateCw } from "lucide-react";
import { TEST_CHECKS } from "../../content/how-it-works-steps";

interface TestStepProps {
  isReducedMotion?: boolean;
  onProgress?: (count: number, running: boolean) => void;
}

export function TestStep({ isReducedMotion = false, onProgress }: TestStepProps) {
  // State of checks: 0 = none passed, 1 = first passed, 2 = two passed, 3 = all passed
  const [passedCount, setPassedCount] = useState<number>(3);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  }, []);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  useEffect(() => {
    onProgress?.(passedCount, isRunning);
  }, [passedCount, isRunning, onProgress]);

  useEffect(() => {
    if (!isReducedMotion) return;
    clearTimers();
    setPassedCount(3);
    setIsRunning(false);
  }, [isReducedMotion, clearTimers]);

  const handleRunTest = () => {
    if (isRunning) return;
    clearTimers();

    if (isReducedMotion) {
      setPassedCount(3);
      setIsRunning(false);
      return;
    }

    setIsRunning(true);
    setPassedCount(0);

    const t1 = setTimeout(() => {
      setPassedCount(1);
    }, 350);

    const t2 = setTimeout(() => {
      setPassedCount(2);
    }, 700);

    const t3 = setTimeout(() => {
      setPassedCount(3);
      setIsRunning(false);
    }, 1050);

    timersRef.current.push(t1, t2, t3);
  };

  return (
    <div className="hiw-step-view hiw-test-view">
      {/* Step Heading & Description */}
      <div className="hiw-step-header">
        <h3 className="hiw-step-heading">Check the answer before you publish.</h3>
        <p className="hiw-step-description">
          Try a customer question and review the result.
        </p>
      </div>

      {/* Main Test Grid: Conversation Left, Checklist Right */}
      <div className="hiw-test-grid">
        {/* Left Column: Sample Conversation */}
        <div className="hiw-test-conversation-panel">
          <div className="hiw-test-panel-header">
            <span className="hiw-test-label">Sample question</span>
            <span className="hiw-test-tag">Live draft</span>
          </div>

          <div className="hiw-test-messages">
            {/* Customer Bubble */}
            <div className="hiw-test-bubble hiw-test-bubble-customer">
              <span className="hiw-test-speaker">Customer</span>
              <p className="hiw-test-bubble-text">What are your opening hours?</p>
            </div>

            {/* Agent Bubble */}
            <div className="hiw-test-bubble hiw-test-bubble-agent">
              <span className="hiw-test-speaker hiw-test-speaker-agent">Agent</span>
              <p className="hiw-test-bubble-text">
                Our team is available Monday to Friday, 9 AM–5 PM.
              </p>
              <div className="hiw-test-citation-chip">
                <FileText className="w-3 h-3 stroke-[1.8] text-[#666666]" aria-hidden="true" />
                <span>Business handbook.pdf</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Automated Checklist */}
        <div className="hiw-test-checklist-panel">
          <div className="hiw-test-panel-header">
            <span className="hiw-test-label">Quality checks</span>
            <span
              className={`hiw-test-status-badge ${
                passedCount === 3
                  ? "hiw-badge-passed"
                  : isRunning
                  ? "hiw-badge-running"
                  : "hiw-badge-idle"
              }`}
            >
              {isRunning
                ? "Evaluating..."
                : `${passedCount} of ${TEST_CHECKS.length} passed`}
            </span>
          </div>

          <div className="hiw-checklist-items">
            {TEST_CHECKS.map((item, index) => {
              const isPassed = index < passedCount;
              return (
                <div key={item.id} className="hiw-checklist-row">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`hiw-check-bullet ${
                        isPassed ? "hiw-check-bullet-passed" : "hiw-check-bullet-pending"
                      }`}
                      aria-hidden="true"
                    >
                      {isPassed ? (
                        <Check className="w-3 h-3 stroke-[2.4]" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-neutral-300" />
                      )}
                    </div>
                    <span className="hiw-check-label">{item.label}</span>
                  </div>
                  <span
                    className={`hiw-check-status ${
                      isPassed ? "hiw-check-passed-text" : "hiw-check-pending-text"
                    }`}
                  >
                    {isPassed ? "Passed" : isRunning ? "Checking" : "Pending"}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="hiw-test-action-wrap">
            <button
              type="button"
              onClick={handleRunTest}
              disabled={isRunning}
              className="hiw-run-test-button"
            >
              {isRunning ? (
                <RotateCw className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
              )}
              <span>{isRunning ? "Running test..." : "Run example test"}</span>
            </button>
            <p className="hiw-test-subnote">
              Runs 3 automated checks against the sample conversation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
