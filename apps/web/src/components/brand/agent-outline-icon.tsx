import type { SVGProps } from "react";
import { LOGO_BODY, LOGO_LEFT_EYE, LOGO_RIGHT_EYE } from "@/lib/marketing/avatar/logo-paths";

interface AgentOutlineIconProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
  strokeWidth?: number;
}

/**
 * Reusable outline-only version of the QuickStart AI brand mark for
 * Agents navigation, agent identity record tiles, test dialogs, and assistant avatars.
 */
export function AgentOutlineIcon({
  size = 20,
  strokeWidth = 16,
  className = "",
  ...props
}: AgentOutlineIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={props["aria-label"] ? undefined : true}
      role="img"
      {...props}
    >
      <path d={LOGO_BODY} />
      <path d={LOGO_LEFT_EYE} />
      <path d={LOGO_RIGHT_EYE} />
    </svg>
  );
}
