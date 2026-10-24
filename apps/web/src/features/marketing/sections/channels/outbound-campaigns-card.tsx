"use client";

import React from "react";

interface OutboundCampaignsCardProps {
  isIntersecting: boolean;
}

export function OutboundCampaignsCard({
  isIntersecting,
}: OutboundCampaignsCardProps) {
  return (
    <div data-channel="outbound" className="channels-card channels-card-outbound-campaigns">
      <div className="channels-card-header">
        <h3 className="channels-card-title">Outbound campaigns</h3>
        <p className="channels-card-desc">
          Reach your contacts and keep every outcome.
        </p>
      </div>

      <div className="channels-card-stage">
        <div className="outbound-visual-container">
          {/* Small Phone Medallion on Left */}
          <div className="outbound-phone-medallion" aria-hidden="true">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fa5d19"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ transform: "rotate(-12deg)" }}
            >
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </div>

          {/* Native SVG Branching Connector Lines */}
          <svg
            className="outbound-connector-svg"
            viewBox="0 0 48 114"
            fill="none"
            aria-hidden="true"
          >
            {/* Branch 1 to Top Row (Calling) */}
            <path
              d="M 2 57 C 22 57, 26 19, 46 19"
              stroke="#dcdcdc"
              strokeWidth="1.5"
            />
            {/* Branch 2 to Middle Row (Answered) */}
            <path
              d="M 2 57 L 46 57"
              stroke="#dcdcdc"
              strokeWidth="1.5"
            />
            {/* Branch 3 to Bottom Row (Queued) */}
            <path
              d="M 2 57 C 22 57, 26 95, 46 95"
              stroke="#dcdcdc"
              strokeWidth="1.5"
            />

            {/* Origin Orange Dot */}
            <circle cx="2" cy="57" r="3" fill="#fa5d19" />

            {/* Destination Endpoint Dots */}
            <circle cx="46" cy="19" r="3" fill="#fa5d19" />
            <circle cx="46" cy="57" r="3" fill="#fa5d19" />
            <circle cx="46" cy="95" r="3" fill="#fa5d19" />

            {/* Calm Traveling Signal Highlight to Calling Row */}
            {isIntersecting && (
              <circle r="3" fill="#ff7a3d">
                <animateMotion
                  path="M 2 57 C 22 57, 26 19, 46 19"
                  dur="2.4s"
                  repeatCount="1"
                  fill="freeze"
                />
                <animate
                  attributeName="opacity"
                  values="1; 1; 0.2; 0"
                  keyTimes="0; 0.7; 0.9; 1"
                  dur="2.4s"
                  fill="freeze"
                />
              </circle>
            )}
          </svg>

          {/* Three Stacked Contact Rows */}
          <div className="outbound-contacts-list">
            {/* Row 1: Example clinic — Calling */}
            <div className="outbound-contact-row">
              <div className="outbound-contact-left">
                <svg
                  className="outbound-building-icon"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
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
                <span className="outbound-contact-name">Example clinic</span>
              </div>
              <div className="outbound-status-group">
                <span className="outbound-status-dot outbound-dot-calling" />
                <span className="outbound-status-text">Calling</span>
              </div>
            </div>

            {/* Row 2: Example salon — Answered */}
            <div className="outbound-contact-row">
              <div className="outbound-contact-left">
                <svg
                  className="outbound-building-icon"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
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
                <span className="outbound-contact-name">Example salon</span>
              </div>
              <div className="outbound-status-group">
                <span className="outbound-status-dot outbound-dot-answered" />
                <span className="outbound-status-text">Answered</span>
              </div>
            </div>

            {/* Row 3: Example studio — Queued */}
            <div className="outbound-contact-row">
              <div className="outbound-contact-left">
                <svg
                  className="outbound-building-icon"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
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
                <span className="outbound-contact-name">Example studio</span>
              </div>
              <div className="outbound-status-group">
                <span className="outbound-status-dot outbound-dot-queued" />
                <span className="outbound-status-text">Queued</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
