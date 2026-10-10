"use client";

import { useId, useRef, type SVGProps } from "react";
import { LOGO_BODY, LOGO_LEFT_EYE, LOGO_RIGHT_EYE } from "@/lib/avatar/logo-paths";
import { useLogoMotion } from "@/lib/avatar/use-logo-motion";
import type { LogoMood } from "@/lib/avatar/definition";

interface BrandLogoProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
  fillColor?: string;
  animated?: boolean;
  paused?: boolean;
  mood?: LogoMood;
}

/** Original ignition mark, with transparent eyes and Avatar Lab driven expressions. */
export function BrandLogo({
  size = 28,
  className = "",
  fillColor = "#fa5d19",
  animated = false,
  paused = false,
  mood = "idle",
  ...props
}: BrandLogoProps) {
  const maskId = `ignition-${useId().replace(/:/g, "")}`;
  const svg = useRef<SVGSVGElement>(null);
  const body = useRef<SVGGElement>(null);
  const left = useRef<SVGGElement>(null);
  const right = useRef<SVGGElement>(null);
  useLogoMotion({ svg, body, left, right, enabled: animated, paused, mood });
  return (
    <svg
      ref={svg}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      width={size}
      height={size}
      fill="none"
      className={className}
      aria-label="QuickStart AI logo"
      role="img"
      {...props}
    >
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="256" height="256">
          <path d={LOGO_BODY} fill="white" />
          <g ref={left}>
            <path d={LOGO_LEFT_EYE} fill="black" />
          </g>
          <g ref={right}>
            <path d={LOGO_RIGHT_EYE} fill="black" />
          </g>
        </mask>
      </defs>
      <g ref={body}>
        <path d={LOGO_BODY} fill={fillColor} mask={`url(#${maskId})`} />
      </g>
    </svg>
  );
}
