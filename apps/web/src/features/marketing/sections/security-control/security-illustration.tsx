"use client";

import { useId } from "react";

export function SecurityIllustration({ className = "" }: { className?: string }) {
  const uid = useId().replace(/:/g, "");
  const id = (name: string) => `security-${name}-${uid}`;
  return (
    <div className={`marketing-security-illustration-frame ${className}`}>
      <svg viewBox="0 0 780 490" fill="none" xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid meet" role="img" aria-labelledby={id("title")} className="marketing-security-svg">
        <title id={id("title")}>Business documents protected by a closed lock.</title>
        <defs>
          <filter id={id("ground")} x="-30%" y="-150%" width="160%" height="400%"><feGaussianBlur stdDeviation="10" /></filter>
          <filter id={id("paper-shadow")} x="-20%" y="-10%" width="150%" height="140%"><feDropShadow dx="2" dy="9" stdDeviation="9" floodColor="#262626" floodOpacity=".055" /></filter>
          <linearGradient id={id("front")} x1="385" y1="174" x2="715" y2="470" gradientUnits="userSpaceOnUse"><stop stopColor="#ff7a3d" /><stop offset=".16" stopColor="#fa5d19" /><stop offset="1" stopColor="#fa5d19" /></linearGradient>
          <linearGradient id={id("side")} x1="685" y1="174" x2="750" y2="470" gradientUnits="userSpaceOnUse"><stop stopColor="#fa5d19" /><stop offset="1" stopColor="#d94a0d" /></linearGradient>
          <linearGradient id={id("shackle")} x1="450" y1="20" x2="680" y2="190" gradientUnits="userSpaceOnUse"><stop stopColor="#454545" /><stop offset=".4" stopColor="#262626" /><stop offset="1" stopColor="#303030" /></linearGradient>
          <linearGradient id={id("fold")} x1="340" y1="113" x2="392" y2="166" gradientUnits="userSpaceOnUse"><stop stopColor="#f5f5f5" /><stop offset="1" stopColor="#e6e6e6" /></linearGradient>
        </defs>
        <g aria-hidden="true">
          {/* Neutral shadows sit behind all solid parts. */}
          <ellipse cx="550" cy="472" rx="174" ry="9" fill="#262626" opacity=".13" filter={`url(#${id("ground")})`} />
          <ellipse cx="220" cy="435" rx="170" ry="7" fill="#262626" opacity=".045" filter={`url(#${id("ground")})`} />
          <g className="marketing-security-docs-group" filter={`url(#${id("paper-shadow")})`}>
            <g className="marketing-security-rear-doc">
              <rect x="28" y="181" width="230" height="220" rx="12" fill="white" stroke="#c9c9ce" strokeWidth="1.5" />
              {[244,266,288,310].map((y,i) => <rect key={y} x="57" y={y} width={[58,70,52,66][i]} height="9" rx="4.5" fill="#e0e0e0" />)}
            </g>
            <g className="marketing-security-mid-doc">
              <rect x="90" y="146" width="230" height="268" rx="12" fill="white" stroke="#c9c9ce" strokeWidth="1.5" />
              {[224,247,270,293].map((y,i) => <rect key={y} x="124" y={y} width={[72,84,66,76][i]} height="10" rx="5" fill="#e0e0e0" />)}
            </g>
            <g className="marketing-security-front-doc">
              <path d="M177 113 H340 L395 168 V421 Q395 433 383 433 H177 Q165 433 165 421 V125 Q165 113 177 113Z" fill="white" stroke="#c9c9ce" strokeWidth="1.5" />
              <path d="M340 113 V157 Q340 168 351 168 H395Z" fill={`url(#${id("fold")})`} />
              {[198,226,254,282,310].map((y,i) => <rect key={y} x="204" y={y} width={[98,146,146,122,74][i]} height="12" rx="6" fill="#e0e0e3" />)}
              <text x="204" y="399" fill="#555555" fontSize="20" fontWeight="400" fontFamily="Inter, sans-serif">Business data</text>
            </g>
          </g>
          {/* Shackle ends and side face are occluded by the front face. */}
          <g className="marketing-security-shackle">
            <path d="M472 197 V123 C472 70 515 27 568 27 C621 27 664 70 664 123 V197" stroke={`url(#${id("shackle")})`} strokeWidth="48" fill="none" />
            <path d="M461 152 V124 C461 65 508 16 568 16 C595 16 620 26 638 43" stroke="#666666" strokeOpacity=".24" strokeWidth="5" strokeLinecap="round" />
          </g>
          <path className="marketing-security-lock-side" d="M674 174 H694 Q750 174 750 230 V414 Q750 470 694 470 H674Z" fill={`url(#${id("side")})`} />
          <rect className="marketing-security-lock-front" x="385" y="174" width="330" height="296" rx="48" fill={`url(#${id("front")})`} />
          <path d="M389 288 V222 Q389 178 433 178 H667 Q705 178 712 214" stroke="#ffad79" strokeOpacity=".65" strokeWidth="2.5" fill="none" />
          <g className="marketing-security-keyhole" fill="white">
            <circle cx="550" cy="285" r="34" />
            <path d="M539 309 H561 L578 379 Q579 384 573 384 H527 Q521 384 522 379Z" />
          </g>
        </g>
      </svg>
    </div>
  );
}
