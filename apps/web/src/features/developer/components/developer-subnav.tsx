"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface DeveloperSubnavProps {
  workspaceId: string;
  isPreview?: boolean;
}

export function DeveloperSubnav({
  workspaceId,
  isPreview = false,
}: DeveloperSubnavProps) {
  const pathname = usePathname();

  const basePath = isPreview
    ? "/preview/developer"
    : `/workspaces/${workspaceId}/developer`;

  const tabs = [
    { label: "Overview", href: basePath, exact: true },
    { label: "API reference", href: `${basePath}/api-reference` },
    { label: "SDK docs", href: `${basePath}/sdks` },
    { label: "Webhooks", href: `${basePath}/webhooks` },
  ];

  return (
    <div className="flex items-center gap-6 overflow-x-auto whitespace-nowrap border-b border-[#ededed] text-sm">
      {tabs.map((tab) => {
        const isActive = tab.exact
          ? pathname === tab.href
          : pathname.startsWith(tab.href);

        return (
          <Link
            key={tab.label}
            href={tab.href}
            className={`font-medium transition-colors relative py-3 ${
              isActive
                ? "text-[#fa5d19]"
                : "text-[#737373] hover:text-[#262626]"
            }`}
          >
            {tab.label}
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#fa5d19]" />
            )}
          </Link>
        );
      })}
    </div>
  );
}
