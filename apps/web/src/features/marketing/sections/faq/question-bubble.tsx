"use client";

import React from "react";

interface QuestionBubbleProps {
  question: string;
}

export function QuestionBubble({ question }: QuestionBubbleProps) {
  return (
    <div className="marketing-faq-bubble-frame">
      <div className="marketing-faq-bubble-rotator">
        {/* Seamless vector outline layer */}
        <svg
          className="marketing-faq-bubble-svg"
          viewBox="0 0 420 300"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M32 4 H388 Q416 4 416 32 V286 Q416 294 410 289 L370 260 H32 Q4 260 4 232 V32 Q4 4 32 4 Z"
            fill="#262626"
            stroke="#fa5d19"
            strokeWidth="2.2"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* Question Text Layer */}
        <div className="marketing-faq-bubble-content">
          <h3 className="marketing-faq-question-text">
            {question === "Do I need to know how to code?" ? <>
              <span>Do I need to</span>{" "}<span>know how</span>{" "}<span>to code?</span>
            </> : question}
          </h3>
        </div>
      </div>
    </div>
  );
}
