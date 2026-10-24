"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

interface WebsiteChatCardProps {
  isIntersecting: boolean;
}

export function WebsiteChatCard({ isIntersecting }: WebsiteChatCardProps) {
  const [step, setStep] = useState(2);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const clear = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);
  const handleLauncherClick = useCallback(() => {
    clear();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.hidden) {
      setStep(2); return;
    }
    setStep(0);
    timers.current = [setTimeout(() => setStep(1), 250), setTimeout(() => setStep(2), 850)];
  }, [clear]);
  useEffect(() => {
    if (isIntersecting) handleLauncherClick();
    else { clear(); setStep(2); }
    return clear;
  }, [isIntersecting, handleLauncherClick, clear]);

  return (
    <div data-channel="chat" className="channels-card channels-card-website-chat">
      <div className="channels-card-header">
        <h3 className="channels-card-title">Website chat</h3>
        <p className="channels-card-desc">
          Answer questions while your visitors browse.
        </p>
      </div>

      <div className="channels-card-stage">
        <div className="chat-visual-container">
          {/* Storefront Window Illustration */}
          <div className="chat-storefront-window">
            <div className="chat-window-chrome" aria-hidden="true">
              <span className="chat-window-dot" />
              <span className="chat-window-dot" />
              <span className="chat-window-dot" />
            </div>

            <div className="chat-products-row" aria-hidden="true">
              {/* Product 1: Square */}
              <div className="chat-product-item">
                <div className="chat-product-tile">
                  <div className="chat-shape-square" />
                </div>
                <div className="chat-product-rules">
                  <div className="chat-rule-bar chat-rule-bar-long" />
                  <div className="chat-rule-bar chat-rule-bar-short" />
                </div>
              </div>

              {/* Product 2: Circle */}
              <div className="chat-product-item">
                <div className="chat-product-tile">
                  <div className="chat-shape-circle" />
                </div>
                <div className="chat-product-rules">
                  <div className="chat-rule-bar chat-rule-bar-long" />
                  <div className="chat-rule-bar chat-rule-bar-short" />
                </div>
              </div>

              {/* Product 3: Triangle */}
              <div className="chat-product-item">
                <div className="chat-product-tile">
                  <div className="chat-shape-triangle" />
                </div>
                <div className="chat-product-rules">
                  <div className="chat-rule-bar chat-rule-bar-long" />
                  <div className="chat-rule-bar chat-rule-bar-short" />
                </div>
              </div>
            </div>
          </div>

          {/* Floating Chat Bubbles */}
          <div className="chat-bubbles-overlay">
            <div
              className="chat-bubble-customer"
              style={{
                opacity: step >= 1 ? 1 : 0,
                transform: step >= 1 ? "translateY(0)" : "translateY(4px)",
              }}
            >
              Do you deliver on Saturday?
            </div>

            <div
              className="chat-bubble-agent"
              style={{
                opacity: step >= 2 ? 1 : 0,
                transform: step >= 2 ? "translateY(0)" : "translateY(4px)",
              }}
            >
              Yes, we do.
            </div>
          </div>

          {/* Circular Chat Launcher Button */}
          <button
            type="button"
            className="chat-launcher-btn"
            onClick={handleLauncherClick}
            aria-label="Preview website chat"
            title="Preview website chat"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
