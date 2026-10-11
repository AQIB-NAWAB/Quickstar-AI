"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Inbox, Bot, ChevronDown, LayoutDashboard, LogOut, Menu, X, Settings, BookOpen, Brain, BarChart3, Workflow, UsersRound, PhoneCall, Send, ClipboardList, Code2 } from "lucide-react";
import { InboxNavItem } from "@/features/workspace/components/inbox-nav-item";
import { useEffect, useRef, useState } from "react";
import { BrandLogo } from "@/components/brand/brand-logo";
import type { WorkspaceSummary } from "@/lib/server/workspace/workspaces";
import { NotificationsProvider } from "@/features/notifications/context/notifications-context";
import { NotificationBell } from "@/features/notifications/components/notification-bell";

type Props = {
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  userEmail: string;
  workspaces: WorkspaceSummary[];
  isPreview?: boolean;
  children: React.ReactNode;
};

export function AppShell({
  workspaceId,
  workspaceName,
  workspaceSlug,
  userEmail,
  workspaces,
  isPreview = false,
  children,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const base = `/workspaces/${workspaceId}`;
  const navigation = [
    { name: "Overview", href: base, icon: LayoutDashboard, exact: true },
    { name: "Agents", href: `${base}/agents`, icon: Bot },
    { name: "Knowledge", href: `${base}/knowledge`, icon: BookOpen },
    { name: "Memory", href: `${base}/memory`, icon: Brain },
    { name: "Analytics", href: `${base}/analytics`, icon: BarChart3 },
    { name: "Workflows", href: `${base}/workflows`, icon: Workflow },
    { name: "Leads", href: `${base}/leads`, icon: UsersRound },
    { name: "Voice", href: `${base}/voice/inbound`, icon: PhoneCall },
    { name: "Campaigns", href: `${base}/campaigns`, icon: Send },
    { name: "Settings", href: `${base}/settings`, icon: Settings },
    { name: "Audit", href: `${base}/audit`, icon: ClipboardList },
    { name: "Developer", href: `${base}/developer`, icon: Code2 },
  ];

  useEffect(() => { setMobileNavOpen(false); }, [pathname]);

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

  const activePath = isPreview ? pathname === "/preview/overview" ? base : pathname.replace("/preview", base) : pathname;
  const section = navigation.find((item) => item.exact ? activePath === item.href : activePath.startsWith(item.name === "Voice" ? `${base}/voice` : item.href))?.name ?? (activePath.includes("/eval") ? "Evaluation" : activePath.includes("/notifications") ? "Notifications" : activePath.includes("/inbox") ? "Inbox" : "Overview");

  const initials = userEmail.slice(0, 2).toUpperCase();

  return (
    <NotificationsProvider workspaceId={workspaceId} isPreview={isPreview}>
      <div className="min-h-screen bg-background-base flex">
        <aside className="hidden md:flex sticky top-[var(--console-offset,0px)] h-[calc(100dvh-var(--console-offset,0px))] shrink-0 w-64 border-r border-border-faint bg-white flex-col justify-between">
          <div className="min-h-0 overflow-y-auto">
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
                const isActive = item.exact
                  ? activePath === item.href
                  : item.name === "Voice"
                    ? activePath.startsWith(`${base}/voice`)
                    : activePath.startsWith(item.href);
                const soon = false;
                const highlight = "highlight" in item && item.highlight;
                return (
                  <Link
                    key={item.name}
                    href={soon ? base : item.href}
                    aria-disabled={soon}
                    className={`flex items-center gap-3 px-3 py-2 rounded-10 text-[13px] font-medium transition-colors ${
                      isActive
                        ? "bg-heat-12 text-heat-100 font-semibold"
                        : highlight
                          ? "text-heat-100 bg-heat-8 hover:bg-heat-12"
                          : "text-neutral-600 hover:text-accent-black hover:bg-neutral-50"
                    } ${soon ? "opacity-70" : ""}`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? "text-heat-100" : "text-neutral-500"}`} />
                    <span>{item.name}</span>
                    {soon ? (
                      <span className="ml-auto text-[10px] font-mono text-neutral-400">Soon</span>
                    ) : null}
                  </Link>
                );
              })}
              {isPreview ? <Link href={base + "/inbox"} className="flex items-center gap-3 px-3 py-2 rounded-10 text-[13px] font-medium text-neutral-600"><Inbox className="w-4 h-4 text-neutral-400" />Inbox</Link> : <InboxNavItem workspaceId={workspaceId} base={base} />}
            </nav>
          </div>

          <div className="p-4 border-t border-border-faint flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center font-medium text-xs text-neutral-700 shrink-0">
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
          <header className="relative h-16 shrink-0 border-b border-border-faint bg-white px-4 sm:px-6 flex items-center justify-between">
            <Link href="/" className="md:hidden flex items-center gap-1.5 text-lg font-bold text-accent-black">
              <BrandLogo className="w-5 h-5 shrink-0" />
              <span>
                QuickStart<span className="text-heat-100"> AI</span>
              </span>
            </Link>
            <p className="text-xs text-neutral-500 hidden sm:block">
              {workspaceName} <span className="px-2 text-neutral-400">/</span> <span className="text-neutral-900 font-medium">{section}</span>
            </p>
            <div className="flex items-center gap-3">
              <button type="button" className="md:hidden p-2 rounded-8 border border-border-faint" aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"} aria-expanded={mobileNavOpen} aria-controls="workspace-mobile-navigation" onClick={() => setMobileNavOpen(!mobileNavOpen)}>
                {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <NotificationBell workspaceId={workspaceId} isPreview={isPreview} />
            </div>
            {mobileNavOpen && <nav id="workspace-mobile-navigation" aria-label="Workspace navigation" className="md:hidden absolute top-full left-0 right-0 z-40 grid grid-cols-2 gap-1 p-3 border-b border-border-faint bg-white shadow-lg max-h-[70dvh] overflow-y-auto">
              {navigation.map(item => <Link key={item.name} href={isPreview && !item.exact && item.name !== "Agents" ? item.href.replace(base, "/preview") : item.href} className={`px-3 py-3 rounded-8 text-sm ${section === item.name ? "bg-heat-12 text-heat-100" : "text-neutral-600"}`}>{item.name}</Link>)}
              <Link href={isPreview ? "/preview/notifications" : `${base}/notifications`} className="px-3 py-3 text-sm text-neutral-600">Notifications</Link>
              <Link href={isPreview ? "/preview/agents/support-assistant/eval" : `${base}/eval/datasets`} className="px-3 py-3 text-sm text-neutral-600">Evaluation</Link>
            </nav>}
          </header>
          <main className="workspace-console flex-1 p-4 sm:p-6 min-w-0">{children}</main>
        </div>
      </div>
    </NotificationsProvider>
  );
}
