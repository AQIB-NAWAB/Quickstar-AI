"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  Bot,
  Brain,
  ChevronDown,
  Code2,
  ClipboardList,
  Compass,
  Cable,
  LogOut,
  Menu,
  MessageSquare,
  Megaphone,
  Phone,
  Send,
  Settings,
  Search,
  UsersRound,
  Workflow,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { NotificationsProvider } from "@/features/notifications/context/notifications-context";
import type { WorkspaceSummary } from "@/lib/server/workspace/workspaces";

type Props = {
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  userEmail: string;
  workspaces: WorkspaceSummary[];
  isPreview?: boolean;
  children: React.ReactNode;
};

type NavItem = {
  name: string;
  href: string;
  icon: typeof Bot;
  match?: string;
  exact?: boolean;
};
type NavSection = { label: string; items: NavItem[] };

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
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const workspaceMenuRef = useRef<HTMLDivElement>(null);
  const base = `/workspaces/${workspaceId}`;
  const route = (path: string) => (isPreview ? `/preview/${path}` : `${base}/${path}`);

  const sections: NavSection[] = [
    {
      label: "Build",
      items: [
        { name: "Agents", href: route("agents"), icon: Bot, match: "/agents" },
        {
          name: "Evaluation",
          href: isPreview ? "/preview/eval" : `${base}/eval/datasets`,
          icon: ClipboardList,
          match: "/eval",
        },
        { name: "Knowledge", href: route("knowledge"), icon: BookOpen, match: "/knowledge" },
        { name: "Memory", href: route("memory"), icon: Brain, match: "/memory" },
      ],
    },
    {
      label: "Operate",
      items: [
        { name: "Inbox", href: route("inbox"), icon: MessageSquare, match: "/inbox" },
        { name: "Leads", href: route("leads"), icon: UsersRound, match: "/leads" },
        {
          name: "Lead generation",
          href: route("lead-generation/runs"),
          icon: Compass,
          match: "/lead-generation",
        },
        {
          name: "Calls",
          href: route("voice/inbound"),
          icon: Phone,
          match: "/voice",
        },
        { name: "Campaigns", href: route("campaigns"), icon: Megaphone, match: "/campaigns" },
      ],
    },
    {
      label: "Workspace",
      items: [
        { name: "Workflows", href: route("workflows"), icon: Workflow, match: "/workflows" },
        { name: "Analytics", href: route("analytics"), icon: BarChart3, match: "/analytics" },
        { name: "Audit", href: route("audit"), icon: ClipboardList, match: "/audit" },
        {
          name: "Notifications",
          href: isPreview ? "/preview/notifications" : `${base}/notifications`,
          icon: Send,
          match: "/notifications",
        },
        { name: "Integrations", href: route("integrations"), icon: Cable, match: "/integrations" },
        { name: "Developer", href: route("developer"), icon: Code2, match: "/developer" },
        { name: "Settings", href: route("settings"), icon: Settings, match: "/settings" },
      ],
    },
  ];
  const navItems = sections.flatMap((section) => section.items);

  const activePath = isPreview ? pathname.replace("/preview", base) : pathname;
  const isItemActive = (item: NavItem) => {
    if (item.name === "Evaluation")
      return activePath.includes("/eval/") || activePath.endsWith("/eval");
    const href = isPreview ? item.href.replace(/^\/preview/, base) : item.href;
    if (item.exact) return activePath === href;
    if (item.name === "Agents" && activePath.includes("/agents/new")) return true;
    if (item.name === "Campaigns" && activePath.includes("/campaigns/new")) return true;
    if (item.name === "Calls" && activePath.includes("/voice")) return true;
    if (item.name === "Leads" && activePath.includes("/leads")) return true;
    if (item.name === "Lead generation" && activePath.includes("/lead-generation")) return true;
    return activePath.startsWith(item.match ? `${base}${item.match}` : href);
  };
  const activeItem = navItems.find(isItemActive) ?? navItems[0];
  useEffect(() => setMobileNavOpen(false), [pathname]);
  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (workspaceMenuRef.current && !workspaceMenuRef.current.contains(event.target as Node)) {
        setWorkspaceMenuOpen(false);
      }
    };
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
    <NotificationsProvider workspaceId={workspaceId} isPreview={isPreview}>
      <div className="workspace-app min-h-screen bg-background-base flex font-medium">
        <aside className="hidden md:flex sticky top-[var(--console-offset,0px)] h-[calc(100dvh-var(--console-offset,0px))] shrink-0 w-[264px] border-r border-border-faint bg-white flex-col">
          <div className="h-16 px-5 border-b border-border-faint flex items-center">
            <Link
              href="/"
              className="flex items-center gap-2 text-[17px] font-bold tracking-tight text-accent-black"
            >
              <BrandLogo className="w-6 h-6 shrink-0" />
              <span>
                QuickStart<span className="text-heat-100"> AI</span>
              </span>
            </Link>
          </div>

          <nav aria-label="Workspace sections" className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
            {sections.map((section) => (
              <section key={section.label}>
                <h2 className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
                  {section.label}
                </h2>
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const ItemIcon = item.icon;
                    const active = isItemActive(item);
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-10 text-[13px] font-semibold transition-colors ${active ? "bg-heat-8 text-heat-100" : "text-neutral-700 hover:bg-neutral-50 hover:text-accent-black"}`}
                      >
                        <ItemIcon
                          className={`w-4 h-4 ${active ? "text-heat-100" : "text-neutral-500"}`}
                        />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
          </nav>

          <div className="p-4 border-t border-border-faint flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full bg-heat-8 flex items-center justify-center font-semibold text-[11px] text-heat-100 shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-accent-black truncate">{userEmail}</p>
                <p className="text-[11px] text-neutral-500">Staff</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void logout()}
              className="text-neutral-400 hover:text-accent-crimson p-2 rounded-8 hover:bg-neutral-50"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-[var(--console-offset,0px)] z-20 shrink-0 border-b border-border-faint bg-white">
            <div className="h-16 px-4 sm:px-6 flex items-center gap-3">
              <button
                type="button"
                className="md:hidden p-2 rounded-10 border border-border-faint text-neutral-600"
                aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"}
                aria-expanded={mobileNavOpen}
                aria-controls="workspace-mobile-navigation"
                onClick={() => setMobileNavOpen((value) => !value)}
              >
                {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <div className="relative shrink-0" ref={workspaceMenuRef}>
                <button
                  type="button"
                  onClick={() => setWorkspaceMenuOpen((value) => !value)}
                  aria-expanded={workspaceMenuOpen}
                  aria-label="Switch workspace"
                  className="flex max-w-[220px] items-center gap-2 rounded-10 border border-border-faint bg-white px-3 py-1.5 text-left hover:border-neutral-300 hover:bg-neutral-50"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-semibold text-accent-black">
                      {workspaceName}
                    </span>
                    <span className="block truncate text-[10px] font-mono text-neutral-500">
                      {workspaceSlug}
                    </span>
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform ${workspaceMenuOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {workspaceMenuOpen && workspaces.length > 0 && (
                  <div className="absolute left-0 top-[calc(100%+6px)] z-30 max-h-64 w-64 overflow-auto rounded-12 border border-border-faint bg-white py-1 shadow-firecrawl-card">
                    {workspaces.map((workspace) => (
                      <Link
                        key={workspace.id}
                        href={`/workspaces/${workspace.id}/agents`}
                        onClick={() => setWorkspaceMenuOpen(false)}
                        className={`block px-3 py-2.5 text-[13px] font-medium hover:bg-neutral-50 ${workspace.id === workspaceId ? "bg-heat-8 font-semibold text-heat-100" : "text-accent-black"}`}
                      >
                        {workspace.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
              <div className="hidden sm:block w-[1px] h-5 bg-neutral-200 mx-1 shrink-0" />
              <div className="flex items-center gap-2 text-xs min-w-0 flex-1 truncate">
                <span className="text-neutral-400 font-normal hidden sm:inline">
                  {activePath.includes("/lead-generation/profile")
                    ? "Lead generation"
                    : activePath.includes("/lead-generation/runs/") && activePath.split("/lead-generation/runs/")[1]
                    ? "Lead generation"
                    : "Workspace"}
                </span>
                <span className="text-neutral-300 font-normal hidden sm:inline">/</span>
                <h1 className="font-bold text-neutral-900 truncate text-xs sm:text-[13px]">
                  {activePath.includes("/lead-generation/profile")
                    ? "Business profile"
                    : activePath.includes("/lead-generation/runs/") && activePath.split("/lead-generation/runs/")[1]
                    ? "Research run"
                    : activePath.includes("/lead-generation")
                    ? "Lead generation"
                    : activePath.includes("/leads")
                    ? "Leads"
                    : activeItem.name}
                </h1>
              </div>
              <NotificationBell workspaceId={workspaceId} isPreview={isPreview} />
            </div>
          </header>

          {mobileNavOpen && (
            <nav
              id="workspace-mobile-navigation"
              aria-label="Workspace navigation"
              className="md:hidden fixed inset-x-0 top-[calc(4rem+var(--console-offset,0px))] bottom-0 z-40 overflow-y-auto border-t border-border-faint bg-white p-4 shadow-xl"
            >
              <div className="space-y-4">
                {sections.map((section) => (
                  <section key={section.label}>
                    <h2 className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
                      {section.label}
                    </h2>
                    <div className="grid grid-cols-2 gap-1">
                      {section.items.map((item) => {
                        const ItemIcon = item.icon;
                        const active = isItemActive(item);
                        return (
                          <Link
                            key={item.name}
                            href={item.href}
                            onClick={() => setMobileNavOpen(false)}
                            className={`flex items-center gap-2.5 rounded-10 px-3 py-3 text-[13px] font-semibold ${active ? "bg-heat-8 text-heat-100" : "text-neutral-700 hover:bg-neutral-50"}`}
                          >
                            <ItemIcon className="h-4 w-4" />
                            {item.name}
                          </Link>
                        );
                      })}
                    </div>
                  </section>
                ))}
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="w-full flex items-center gap-2 rounded-10 px-3 py-3 text-[13px] font-semibold text-neutral-700 hover:bg-neutral-50"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </nav>
          )}

          <main className="workspace-console flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
            <div className="mx-auto w-full max-w-[1440px]">{children}</div>
          </main>
        </div>
      </div>
    </NotificationsProvider>
  );
}
