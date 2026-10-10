"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Inbox } from "lucide-react";
import { useWaitingCount } from "@/components/inbox/inbox-waiting-badge";

type Props = {
  workspaceId: string;
  base: string;
};

export function InboxNavItem({ workspaceId, base }: Props) {
  const pathname = usePathname();
  const href = `${base}/inbox`;
  const isActive = pathname === href || pathname.startsWith(`${href}/`);
  const waiting = useWaitingCount(workspaceId);

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2 rounded-10 text-xs font-medium transition-colors ${
        isActive
          ? "bg-heat-12 text-heat-100 font-semibold"
          : "text-neutral-600 hover:text-accent-black hover:bg-neutral-50"
      }`}
    >
      <Inbox className={`w-4 h-4 ${isActive ? "text-heat-100" : "text-neutral-400"}`} />
      <span>Inbox</span>
      {waiting > 0 ? (
        <span className="ml-auto min-w-[1.25rem] rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold px-1.5 py-0.5 text-center">
          {waiting > 99 ? "99+" : waiting}
        </span>
      ) : null}
    </Link>
  );
}
