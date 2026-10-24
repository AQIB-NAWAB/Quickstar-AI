"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface VoiceSubnavProps {
  workspaceId: string;
  isPreview?: boolean;
  liveCount?: number;
}

export function VoiceSubnav({
  workspaceId,
  isPreview = false,
  liveCount = 2,
}: VoiceSubnavProps) {
  const pathname = usePathname();

  const baseInbound = isPreview
    ? "/preview/voice/inbound"
    : `/workspaces/${workspaceId}/voice/inbound`;
  const baseLive = `${baseInbound}/live`;
  const baseOutbound = isPreview
    ? "/preview/voice/outbound"
    : `/workspaces/${workspaceId}/voice/outbound`;
  const baseNumbers = isPreview
    ? "/preview/voice/numbers"
    : `/workspaces/${workspaceId}/voice/numbers`;

  // Detect active tab
  const isLive = pathname.endsWith("/live");
  const isOutbound = pathname.includes("/voice/outbound");
  const isNumbers = pathname.includes("/voice/numbers");
  const isCallLogs = !isLive && !isOutbound && !isNumbers;

  return (
    <div className="flex items-center gap-1 border-b border-border-faint text-xs font-medium">
      <Link
        href={baseInbound}
        className={`px-3.5 py-2 border-b-2 transition-colors ${
          isCallLogs
            ? "border-heat-100 text-heat-100 font-semibold"
            : "border-transparent text-neutral-600 hover:text-accent-black hover:border-neutral-300"
        }`}
      >
        Call logs
      </Link>

      <Link
        href={baseNumbers}
        className={`px-3.5 py-2 border-b-2 transition-colors ${
          isNumbers
            ? "border-heat-100 text-heat-100 font-semibold"
            : "border-transparent text-neutral-600 hover:text-accent-black hover:border-neutral-300"
        }`}
      >
        Numbers
      </Link>

      <Link
        href={baseLive}
        className={`flex items-center gap-1.5 px-3.5 py-2 border-b-2 transition-colors ${
          isLive
            ? "border-heat-100 text-heat-100 font-semibold"
            : "border-transparent text-neutral-600 hover:text-accent-black hover:border-neutral-300"
        }`}
      >
        <span>Live calls</span>
        {liveCount > 0 && (
          <span className="w-4 h-4 rounded-full bg-heat-100 text-white text-[10px] font-bold flex items-center justify-center">
            {liveCount}
          </span>
        )}
      </Link>

      <Link
        href={baseOutbound}
        className={`px-3.5 py-2 border-b-2 transition-colors ${
          isOutbound
            ? "border-heat-100 text-heat-100 font-semibold"
            : "border-transparent text-neutral-600 hover:text-accent-black hover:border-neutral-300"
        }`}
      >
        Outbound calls
      </Link>
    </div>
  );
}
