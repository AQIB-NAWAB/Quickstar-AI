"use client";

import React from "react";

interface AppAccessCardProps {
  isIntersecting: boolean;
}

export function AppAccessCard({ isIntersecting }: AppAccessCardProps) {
  return (
    <div data-channel="app" className="channels-card channels-card-app-access">
      <div className="channels-card-header">
        <h3 className="channels-card-title">In your app</h3>
        <p className="channels-card-desc">
          Connect the same agent to your own product.
        </p>
      </div>

      <div className="channels-card-stage">
        <div className="app-access-container">
          {/* Unit 1: Your app */}
          <div className="app-unit-column">
            <span className="app-unit-label">Your app</span>
            <div className="app-client-window" aria-hidden="true">
              <div className="app-window-dots">
                <span className="app-window-dot" />
                <span className="app-window-dot" />
              </div>
              <div className="app-client-body">
                <div className="app-client-sidebar" />
                <div className="app-client-lines">
                  <div
                    style={{
                      height: 4,
                      width: "80%",
                      borderRadius: 2,
                      backgroundColor: "#e8e8e8",
                    }}
                  />
                  <div
                    style={{
                      height: 4,
                      width: "60%",
                      borderRadius: 2,
                      backgroundColor: "#e8e8e8",
                    }}
                  />
                  <div
                    style={{
                      height: 4,
                      width: "70%",
                      borderRadius: 2,
                      backgroundColor: "#e8e8e8",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Central Horizontal Connector with API Label */}
          <div className="app-connector-block" aria-hidden="true">
            <span className="app-api-label">API</span>
            <svg
              className="app-connector-svg"
              viewBox="0 0 60 8"
              fill="none"
              aria-hidden="true"
            >
              <line
                x1="4"
                y1="4"
                x2="56"
                y2="4"
                stroke="#fa5d19"
                strokeWidth="1.5"
              />
              <circle cx="4" cy="4" r="3" fill="#fa5d19" />
              <circle cx="56" cy="4" r="3" fill="#fa5d19" />

              {/* Tiny traveling signal from left to right */}
              {isIntersecting && (
                <circle r="2.5" fill="#ffffff">
                  <animateMotion
                    path="M 4 4 L 56 4"
                    dur="2.2s"
                    repeatCount="1"
                    fill="freeze"
                  />
                  <animate
                    attributeName="opacity"
                    values="1; 1; 0"
                    keyTimes="0; 0.85; 1"
                    dur="2.2s"
                    fill="freeze"
                  />
                </circle>
              )}
            </svg>
          </div>

          {/* Unit 2: Your agent */}
          <div className="app-unit-column">
            <span className="app-unit-label">Your agent</span>
            <div className="app-agent-window" aria-hidden="true">
              {/* Restrained Orange Agent Symbol (6-Ray Asterisk Mark matching reference) */}
              <svg
                className="app-agent-symbol"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fa5d19"
                strokeWidth="2.4"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <line x1="12" y1="3" x2="12" y2="21" />
                <line x1="4.2" y1="7.5" x2="19.8" y2="16.5" />
                <line x1="4.2" y1="16.5" x2="19.8" y2="7.5" />
              </svg>

              <div className="app-agent-lines">
                <div
                  style={{
                    height: 4,
                    width: "55px",
                    borderRadius: 2,
                    backgroundColor: "#e8e8e8",
                  }}
                />
                <div
                  style={{
                    height: 4,
                    width: "36px",
                    borderRadius: 2,
                    backgroundColor: "#e8e8e8",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
