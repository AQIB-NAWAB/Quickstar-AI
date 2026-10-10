"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { isOnboardingComplete, onboardingPath } from "@/lib/onboarding";

type Props = { workspaceId: string };

export function OnboardingBanner({ workspaceId }: Props) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(!isOnboardingComplete(workspaceId));
  }, [workspaceId]);

  if (!show) {
    return null;
  }

  return (
    <div className="mb-6 rounded-12 border border-heat-24 bg-heat-8 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <p className="text-sm text-accent-black">
        <span className="font-semibold">Setup incomplete.</span> Finish the short workspace guide to see what to build
        next.
      </p>
      <Link
        href={onboardingPath(workspaceId)}
        className="inline-flex shrink-0 items-center justify-center rounded-10 button-primary px-4 py-2 text-xs font-semibold text-white"
      >
        Continue setup
      </Link>
    </div>
  );
}
