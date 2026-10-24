"use client";

import { useId } from "react";
import { LOGO_BODY, LOGO_LEFT_EYE, LOGO_RIGHT_EYE } from "@/lib/marketing/avatar/logo-paths";

/** Individually layered vector artwork; the front rim occludes the inserted pass. */
export function AgentDockIllustration() {
  const id = `agent-dock-${useId().replace(/:/g, "")}`;
  return (
    <div className="marketing-final-cta-illustration-wrapper" aria-hidden="true">
      <svg className="marketing-final-cta-svg" viewBox="0 0 680 650" fill="none" xmlns="http://www.w3.org/2000/svg" focusable="false">
        <defs>
          {/* Object-relative filter regions remain valid after the pass is transformed. */}
          <filter id={`${id}-shadow`} x="-30%" y="-30%" width="160%" height="180%">
            <feDropShadow dx="0" dy="18" stdDeviation="14" floodColor="#63412d" floodOpacity=".16" />
          </filter>
          <filter id={`${id}-pass-shadow`} x="-25%" y="-20%" width="160%" height="150%">
            <feDropShadow dx="3" dy="5" stdDeviation="4" floodColor="#5b493c" floodOpacity=".1" />
          </filter>
          <linearGradient id={`${id}-front`} x1="160" y1="420" x2="580" y2="610" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ff742e" /><stop offset=".55" stopColor="#fa5d19" /><stop offset="1" stopColor="#ed4a0a" />
          </linearGradient>
          <linearGradient id={`${id}-inside`} x1="350" y1="405" x2="350" y2="492" gradientUnits="userSpaceOnUse">
            <stop stopColor="#c6460a" /><stop offset="1" stopColor="#ee641b" />
          </linearGradient>
          <linearGradient id={`${id}-paper`} x1="0" y1="0" x2="290" y2="480" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ffffff" /><stop offset="1" stopColor="#f9f7f3" />
          </linearGradient>
        </defs>

        <g transform="translate(112 190) rotate(-16)">
          <path d="M14 0H151L184 34V224Q184 238 170 238H14Q0 238 0 224V14Q0 0 14 0Z" fill="#eee9e2" />
          <path d="M151 0V25Q151 34 160 34H184Z" fill="#e7e0d6" />
          {[76, 105, 134, 163].map((y, i) => <rect key={y} x="27" y={y} width={[105, 127, 116, 80][i]} height="9" rx="4.5" fill="#e1d9ce" />)}
        </g>
        <g transform="translate(576 195) rotate(0)">
          <path d="M23 40C9 89 25 149 67 186" stroke="#e6dfd5" strokeWidth="35" strokeLinecap="round" />
          <path d="M20 36C6 85 22 145 64 182" stroke="#eee8e0" strokeWidth="35" strokeLinecap="round" />
          <rect x="-4" y="0" width="53" height="69" rx="19" fill="#eee8e0" />
          <rect x="43" y="154" width="55" height="70" rx="19" transform="rotate(-28 70 189)" fill="#eee8e0" />
        </g>

        <g filter={`url(#${id}-shadow)`}>
          {/* Back rim and recessed opening. */}
          <path d="M153 420Q159 401 187 397L545 416Q575 418 586 438L602 559Q602 577 582 583L526 570L143 532Z" fill="#ee5715" />
          <path d="M159 422Q164 408 189 406L545 426Q569 428 576 441L561 477L159 460Z" fill={`url(#${id}-inside)`} stroke="#ff8b47" strokeWidth="8" />

          {/* The full pass is drawn between the rear and front dock faces. */}
          <g transform="translate(310 5) rotate(7)">
            <g filter={`url(#${id}-pass-shadow)`}>
              <rect x="5" y="4" width="289" height="480" rx="27" fill="#e5dbd0" />
              <rect width="289" height="480" rx="27" fill={`url(#${id}-paper)`} stroke="#ae9f91" strokeWidth="1.4" />
              <rect x="8" y="8" width="273" height="464" rx="21" stroke="#f0ebe5" strokeWidth="2" />
            </g>
            <text x="144.5" y="61" textAnchor="middle" fill="#42464a" fontFamily="Inter, sans-serif" fontSize="13" fontWeight="600" letterSpacing="3">YOUR AGENT</text>
            <circle cx="144.5" cy="191" r="89" fill="#fa5d19" />
            <g transform="translate(84 128) scale(.47)">
              <path d={`${LOGO_BODY} ${LOGO_LEFT_EYE} ${LOGO_RIGHT_EYE}`} fill="white" fillRule="evenodd" />
            </g>
            <text x="144.5" y="306" textAnchor="middle" fill="#262626" fontFamily="Inter, sans-serif" fontSize="25" fontWeight="700" letterSpacing="-.8">Customer support</text>
            <text x="144.5" y="335" textAnchor="middle" fill="#666666" fontFamily="Inter, sans-serif" fontSize="18">Knows your business</text>
            <g transform="translate(49 370)">
              <circle cx="20" cy="20" r="22" stroke="#fa5d19" strokeWidth="1.2" />
              <path d="M10 20L17 27L30 13" stroke="#fa5d19" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              <text x="53" y="25" fill="#262626" fontFamily="Inter, sans-serif" fontSize="17">Ready to publish</text>
            </g>
          </g>

          {/* Front face deliberately covers only the pass's bottom edge. */}
          <path d="M146 445L554 468L584 442L603 557Q607 582 583 591L537 581L145 553Z" fill="#db480b" />
          <path d="M145 434Q149 423 161 426L561 451Q573 452 573 468L561 571Q559 592 535 591L157 561Q135 560 135 539Z" fill={`url(#${id}-front)`} />
          <path d="M150 430L564 456" stroke="#ff9856" strokeWidth="3" strokeLinecap="round" />
          <path d="M431 527L504 533M480 505L508 533L477 553" stroke="#fffaf3" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
    </div>
  );
}
