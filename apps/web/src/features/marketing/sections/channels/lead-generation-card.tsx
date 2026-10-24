"use client";

import React from "react";

interface LeadGenerationCardProps {
  isIntersecting: boolean;
}

export function LeadGenerationCard({
  isIntersecting,
}: LeadGenerationCardProps) {
  return (
    <div data-channel="leads" className="channels-card channels-card-lead-generation">
      <div className="channels-card-header">
        <h3 className="channels-card-title">Lead generation</h3>
        <p className="channels-card-desc">Find businesses worth talking to.</p>
      </div>

      <div className="channels-card-stage">
        <div className="lead-gen-container">
          {/* Rear Contact Record */}
          <div className="lead-record-rear" aria-hidden="true">
            <div className="lead-record-header">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#9ca3af"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
                <path d="M9 22v-4h6v4" />
                <path d="M8 6h.01" />
                <path d="M16 6h.01" />
                <path d="M8 10h.01" />
                <path d="M16 10h.01" />
              </svg>
              <div
                style={{
                  height: 4,
                  width: "55px",
                  borderRadius: 2,
                  backgroundColor: "#e8e8e8",
                }}
              />
            </div>
            <div className="lead-record-rules">
              <div
                style={{
                  height: 4,
                  width: "75%",
                  borderRadius: 2,
                  backgroundColor: "#e8e8e8",
                }}
              />
              <div
                style={{
                  height: 4,
                  width: "45%",
                  borderRadius: 2,
                  backgroundColor: "#e8e8e8",
                }}
              />
            </div>
          </div>

          {/* Front Contact Record */}
          <div
            className="lead-record-front"
            style={{
              transform: isIntersecting
                ? "translateY(-4px)"
                : "translateY(0px)",
            }}
          >
            <div className="lead-record-header">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#666666"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
                <path d="M9 22v-4h6v4" />
                <path d="M8 6h.01" />
                <path d="M16 6h.01" />
                <path d="M8 10h.01" />
                <path d="M16 10h.01" />
                <path d="M8 14h.01" />
                <path d="M16 14h.01" />
              </svg>
              <span className="lead-record-name">Example clinic</span>
            </div>
            <div className="lead-record-rules" aria-hidden="true">
              <div
                style={{
                  height: 4,
                  width: "80%",
                  borderRadius: 2,
                  backgroundColor: "#e2e2e2",
                }}
              />
              <div
                style={{
                  height: 4,
                  width: "55%",
                  borderRadius: 2,
                  backgroundColor: "#e2e2e2",
                }}
              />
            </div>
          </div>

          {/* Orange Search Medallion */}
          <div
            className="lead-search-medallion"
            aria-hidden="true"
            title="Search leads"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
