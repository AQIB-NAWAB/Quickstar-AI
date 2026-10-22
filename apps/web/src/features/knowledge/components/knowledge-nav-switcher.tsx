"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Database } from "lucide-react";

interface KnowledgeNavSwitcherProps {
  workspaceId: string;
}

export function KnowledgeNavSwitcher({ workspaceId }: KnowledgeNavSwitcherProps) {
  const pathname = usePathname();
  const isKnowledge = pathname.includes(`/workspaces/${workspaceId}/knowledge`);
  const isMemory = pathname.includes(`/workspaces/${workspaceId}/memory`);

  return (
    <div className="md:hidden flex items-center gap-1.5 p-1 bg-neutral-100 rounded-10 border border-border-faint w-fit">
      <Link
        href={`/workspaces/${workspaceId}/knowledge`}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-8 text-xs font-medium transition-colors ${
          isKnowledge
            ? "bg-white text-[#FF571A] font-semibold shadow-sm"
            : "text-neutral-600 hover:text-accent-black"
        }`}
      >
        <BookOpen className="w-3.5 h-3.5" />
        <span>Knowledge</span>
      </Link>
      <Link
        href={`/workspaces/${workspaceId}/memory`}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-8 text-xs font-medium transition-colors ${
          isMemory
            ? "bg-white text-[#FF571A] font-semibold shadow-sm"
            : "text-neutral-600 hover:text-accent-black"
        }`}
      >
        <Database className="w-3.5 h-3.5" />
        <span>Memory</span>
      </Link>
    </div>
  );
}
