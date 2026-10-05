import React from "react";

interface BrandLogoProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  className?: string;
  fillColor?: string;
}

/**
 * QuickStart AI — Prompt Bot Brand Logo
 * Features speech-bubble / bot silhouette with terminal prompt eyes (> and | caret).
 */
export function BrandLogo({
  size = 28,
  className = "",
  fillColor = "#FA5D19",
  ...props
}: BrandLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      width={size}
      height={size}
      fill="none"
      className={className}
      aria-label="QuickStart AI Logo"
      role="img"
      {...props}
    >
      <g transform="translate(-1 -3)">
        <path
          fillRule="evenodd"
          fill={fillColor}
          d="M28.00 104.00 A74.00 74.00 0 0 1 102.00 30.00 L154.00 30.00 A74.00 74.00 0 0 1 228.00 104.00 L228.00 227.10 A7.00 7.00 0 0 1 216.05 232.05 L185.46 201.46 A5.00 5.00 0 0 0 181.93 200.00 L102.00 200.00 A74.00 74.00 0 0 1 28.00 126.00Z M99.51 77.13 L129.51 99.13 A11.00 11.00 0 0 1 129.51 116.87 L99.51 138.87 A11.00 11.00 0 0 1 86.49 121.13 L104.40 108.00 L86.49 94.87 A11.00 11.00 0 0 1 99.51 77.13 Z M155.75 85.32 A11.00 11.00 0 0 1 177.00 79.63 L184.25 106.68 A11.00 11.00 0 0 1 163.00 112.37 Z"
        />
      </g>
    </svg>
  );
}
