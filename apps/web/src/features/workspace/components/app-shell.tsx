"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bot, ChevronDown, LayoutDashboard, LogOut, Settings } from "lucide-react";
import { InboxNavItem } from "@/features/workspace/components/inbox-nav-item";
import { useEffect, useRef, useState } from "react";
import { BrandLogo } from "@/components/brand/brand-logo";
import type { WorkspaceSummary } from "@/lib/server/workspace/workspaces";

type Props = {
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  userEmail: string;
  workspaces: WorkspaceSummary[];
  children: React.ReactNode;
};

export function AppShell({
  workspaceId,
  workspaceName,
  workspaceSlug,
  userEmail,
  workspaces,
  children,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const base = `/workspaces/${workspaceId}`;
  const navigation = [
    { name: "Overview", href: base, icon: LayoutDashboard, exact: true },
    { name: "Agents", href: `${base}/agents`, icon: Bot, soon: true },
    { name: "Settings", href: `${base}/settings`, icon: Settings, soon: true },
  ];

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const initials = userEmail.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-background-base flex">
      <aside className="hidden md:flex w-64 border-r border-border-faint bg-white flex-col justify-between">
        <div>
          <div className="h-16 px-6 border-b border-border-faint flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2 text-lg font-bold tracking-tight text-accent-black hover:opacity-90"
            >
              <BrandLogo className="w-6 h-6 shrink-0" />
              <span>
                QuickStart<span className="text-heat-100"> AI</span>
              </span>
            </Link>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-heat-12 text-heat-100 border border-heat-24">
              APP
            </span>
          </div>

          <div className="p-4 border-b border-border-faint relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="w-full flex items-center justify-between p-2.5 rounded-10 border border-border-faint hover:bg-neutral-50 text-left text-xs transition-colors"
            >
              <div className="min-w-0">
                <p className="font-semibold text-accent-black truncate">{workspaceName}</p>
                <p className="text-neutral-500 font-mono text-[10px] truncate">{workspaceSlug}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0" />
            </button>
            {menuOpen && workspaces.length > 0 ? (
              <div className="absolute left-4 right-4 top-[calc(100%-4px)] z-20 mt-1 rounded-10 border border-border-faint bg-white shadow-firecrawl-card py-1 max-h-48 overflow-auto">
                {workspaces.map((ws) => (
                  <Link
                    key={ws.id}
                    href={`/workspaces/${ws.id}`}
                    onClick={() => setMenuOpen(false)}
                    className={`block px-3 py-2 text-xs hover:bg-neutral-50 ${
                      ws.id === workspaceId ? "bg-heat-12 text-heat-100 font-semibold" : "text-accent-black"
                    }`}
                  >
                    {ws.name}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>

          <nav className="p-3 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              const soon = "soon" in item && item.soon;
              const highlight = "highlight" in item && item.highlight;
              return (
                <Link
                  key={item.name}
                  href={soon ? base : item.href}
                  aria-disabled={soon}
                  className={`flex items-center gap-3 px-3 py-2 rounded-10 text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-heat-12 text-heat-100 font-semibold"
                      : highlight
                        ? "text-heat-100 bg-heat-8 hover:bg-heat-12"
                        : "text-neutral-600 hover:text-accent-black hover:bg-neutral-50"
                  } ${soon ? "opacity-70" : ""}`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-heat-100" : "text-neutral-400"}`} />
                  <span>{item.name}</span>
                  {item.soon ? (
                    <span className="ml-auto text-[10px] font-mono text-neutral-400">Soon</span>
                  ) : null}
                </Link>
              );
            })}
            <InboxNavItem workspaceId={workspaceId} base={base} />
          </nav>
        </div>

        <div className="p-4 border-t border-border-faint flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-heat-12 flex items-center justify-center font-bold text-xs text-heat-100 shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-accent-black truncate">{userEmail}</p>
              <p className="text-[10px] text-neutral-500">Staff</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            className="text-neutral-400 hover:text-accent-crimson p-1 shrink-0"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border-faint bg-white/80 backdrop-blur-md px-6 flex items-center justify-between">
          <Link href="/" className="md:hidden flex items-center gap-1.5 text-lg font-bold text-accent-black">
            <BrandLogo className="w-5 h-5 shrink-0" />
            <span>
              QuickStart<span className="text-heat-100"> AI</span>
            </span>
          </Link>
          <p className="text-xs text-neutral-500 font-mono hidden sm:block">
            Gateway · workspace-scoped session
          </p>
        </header>
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
