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
  Cable,
  LogOut,
  Menu,
  MessageSquare,
  Megaphone,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  Radio,
  Send,
  Settings,
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
type NavGroup = { name: string; icon: typeof Bot; items: NavItem[] };

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

  const groups: NavGroup[] = [
    {
      name: "Agents",
      icon: Bot,
      items: [
        { name: "All agents", href: route("agents"), icon: Bot, match: "/agents" },
        { name: "Create agent", href: route("agents/new"), icon: Bot, exact: true },
        {
          name: "Evaluation",
          href: isPreview ? "/preview/eval" : `${base}/eval/datasets`,
          icon: ClipboardList,
          match: "/eval",
        },
      ],
    },
    {
      name: "Knowledge",
      icon: BookOpen,
      items: [
        { name: "Knowledge sources", href: route("knowledge"), icon: BookOpen },
        { name: "Memory", href: route("memory"), icon: Brain },
      ],
    },
    {
      name: "Conversations",
      icon: MessageSquare,
      items: [{ name: "Inbox", href: route("inbox"), icon: MessageSquare }],
    },
    {
      name: "Leads",
      icon: UsersRound,
      items: [{ name: "All leads", href: route("leads"), icon: UsersRound }],
    },
    {
      name: "Voice",
      icon: PhoneCall,
      items: [
        {
          name: "Inbound calls",
          href: route("voice/inbound"),
          icon: PhoneIncoming,
          match: "/voice/inbound",
        },
        {
          name: "Live calls",
          href: route("voice/inbound/live"),
          icon: Radio,
          exact: true,
        },
        {
          name: "Outbound calls",
          href: route("voice/outbound"),
          icon: PhoneOutgoing,
          match: "/voice/outbound",
        },
      ],
    },
    {
      name: "Campaigns",
      icon: Megaphone,
      items: [
        { name: "All campaigns", href: route("campaigns"), icon: Megaphone, match: "/campaigns" },
        { name: "Create campaign", href: route("campaigns/new"), icon: Send, exact: true },
      ],
    },
    {
      name: "Integrations",
      icon: Cable,
      items: [
        { name: "Integrations", href: route("integrations"), icon: Cable },
        { name: "Developer portal", href: route("developer"), icon: Code2, exact: true },
        {
          name: "API reference",
          href: route("developer/api-reference"),
          icon: ClipboardList,
        },
        { name: "SDK docs", href: route("developer/sdks"), icon: Code2 },
        { name: "Webhooks", href: route("developer/webhooks"), icon: Workflow },
      ],
    },
    {
      name: "Workspace",
      icon: Settings,
      items: [
        { name: "Workflows", href: route("workflows"), icon: Workflow },
        { name: "Analytics", href: route("analytics"), icon: BarChart3 },
        { name: "Audit", href: route("audit"), icon: ClipboardList },
        {
          name: "Notifications",
          href: isPreview ? "/preview/notifications" : `${base}/notifications`,
          icon: Send,
        },
        { name: "Settings", href: route("settings"), icon: Settings },
      ],
    },
  ];

  const activePath = isPreview ? pathname.replace("/preview", base) : pathname;
  const isItemActive = (item: NavItem) => {
    if (item.name === "Evaluation")
      return activePath.includes("/eval/") || activePath.endsWith("/eval");
    const href = isPreview ? item.href.replace(/^\/preview/, base) : item.href;
    if (item.exact) return activePath === href;
    if (item.name === "All agents" && activePath.startsWith(`${base}/agents/new`)) return false;
    if (item.name === "All campaigns" && activePath.startsWith(`${base}/campaigns/new`))
      return false;
    if (item.name === "Inbound calls" && activePath.startsWith(`${base}/voice/inbound/live`))
      return false;
    return activePath.startsWith(item.match ? `${base}${item.match}` : href);
  };
  const activeGroup = groups.find((group) => group.items.some(isItemActive)) ?? groups[0];
  const activeItem = activeGroup.items.find(isItemActive) ?? activeGroup.items[0];
  const [openGroup, setOpenGroup] = useState(activeGroup.name);

  useEffect(() => setOpenGroup(activeGroup.name), [activeGroup.name]);
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
  const sectionTabs = activeGroup.items;

  return (
    <NotificationsProvider workspaceId={workspaceId} isPreview={isPreview}>
      <div className="workspace-app min-h-screen bg-background-base flex">
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

          <div className="p-4 border-b border-border-faint relative" ref={workspaceMenuRef}>
            <button
              type="button"
              onClick={() => setWorkspaceMenuOpen((value) => !value)}
              aria-expanded={workspaceMenuOpen}
              className="w-full flex items-center justify-between p-3 rounded-12 border border-border-faint hover:border-neutral-300 hover:bg-neutral-50 text-left transition-colors"
            >
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold text-accent-black truncate">
                  {workspaceName}
                </span>
                <span className="block mt-0.5 text-[11px] text-neutral-500 font-mono truncate">
                  {workspaceSlug}
                </span>
              </span>
              <ChevronDown
                className={`w-4 h-4 text-neutral-400 transition-transform ${workspaceMenuOpen ? "rotate-180" : ""}`}
              />
            </button>
            {workspaceMenuOpen && workspaces.length > 0 && (
              <div className="absolute left-4 right-4 top-[calc(100%-4px)] z-30 mt-1 rounded-12 border border-border-faint bg-white shadow-firecrawl-card py-1 max-h-56 overflow-auto">
                {workspaces.map((workspace) => (
                  <Link
                    key={workspace.id}
                    href={`/workspaces/${workspace.id}/agents`}
                    onClick={() => setWorkspaceMenuOpen(false)}
                    className={`block px-3 py-2.5 text-[13px] hover:bg-neutral-50 ${workspace.id === workspaceId ? "bg-heat-8 text-heat-100 font-semibold" : "text-accent-black"}`}
                  >
                    {workspace.name}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <nav aria-label="Workspace sections" className="flex-1 overflow-y-auto p-3 space-y-2">
            {groups.map((group) => {
              const GroupIcon = group.icon;
              const expanded = openGroup === group.name;
              const selected = activeGroup.name === group.name;
              return (
                <section key={group.name} className="rounded-12">
                  <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={() => setOpenGroup(expanded ? "" : group.name)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-10 text-[13px] font-semibold transition-colors ${selected ? "text-accent-black" : "text-neutral-600 hover:bg-neutral-50 hover:text-accent-black"}`}
                  >
                    <GroupIcon
                      className={`w-[17px] h-[17px] ${selected ? "text-heat-100" : "text-neutral-400"}`}
                    />
                    <span className="flex-1 text-left">{group.name}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-neutral-400 transition-transform ${expanded ? "rotate-180" : ""}`}
                    />
                  </button>
                  {expanded && (
                    <div className="ml-[21px] mt-1 pl-3 border-l border-border-faint space-y-0.5">
                      {group.items.map((item) => {
                        const ItemIcon = item.icon;
                        const active = isItemActive(item);
                        return (
                          <Link
                            key={item.name}
                            href={item.href}
                            aria-current={active ? "page" : undefined}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-8 text-[13px] transition-colors ${active ? "bg-heat-8 text-heat-100 font-semibold" : "text-neutral-600 hover:bg-neutral-50 hover:text-accent-black"}`}
                          >
                            <ItemIcon
                              className={`w-4 h-4 ${active ? "text-heat-100" : "text-neutral-400"}`}
                            />
                            <span>{item.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
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
            <div className="h-16 px-4 sm:px-6 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <Link
                  href="/"
                  className="md:hidden flex items-center gap-1.5 text-[17px] font-bold text-accent-black"
                >
                  <BrandLogo className="w-5 h-5" />
                  <span>
                    QuickStart<span className="text-heat-100"> AI</span>
                  </span>
                </Link>
                <div className="hidden md:block min-w-0">
                  <p className="text-[11px] text-neutral-500">{workspaceName}</p>
                  <h1 className="text-[15px] font-bold tracking-tight text-accent-black">
                    {activeItem.name}
                  </h1>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <NotificationBell workspaceId={workspaceId} isPreview={isPreview} />
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
              </div>
            </div>
            <nav
              aria-label={`${activeGroup.name} pages`}
              className="flex items-center gap-1 px-4 sm:px-6 overflow-x-auto"
            >
              {sectionTabs.map((item) => {
                const active = isItemActive(item);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`relative shrink-0 px-3 py-3 text-[13px] font-medium transition-colors ${active ? "text-heat-100" : "text-neutral-500 hover:text-accent-black"}`}
                  >
                    {item.name}
                    {active && (
                      <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-heat-100" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </header>

          {mobileNavOpen && (
            <nav
              id="workspace-mobile-navigation"
              aria-label="Workspace navigation"
              className="md:hidden fixed inset-x-0 top-[calc(4rem+var(--console-offset,0px))] bottom-0 z-40 overflow-y-auto border-t border-border-faint bg-white p-4 shadow-xl"
            >
              <div className="space-y-4">
                {groups.map((group) => (
                  <section key={group.name}>
                    <h2 className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
                      {group.name}
                    </h2>
                    <div className="grid grid-cols-2 gap-1">
                      {group.items.map((item) => {
                        const ItemIcon = item.icon;
                        const active = isItemActive(item);
                        return (
                          <Link
                            key={item.name}
                            href={item.href}
                            className={`flex items-center gap-2.5 rounded-10 px-3 py-3 text-[13px] ${active ? "bg-heat-8 text-heat-100 font-semibold" : "text-neutral-600 hover:bg-neutral-50"}`}
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
                  className="w-full flex items-center gap-2 rounded-10 px-3 py-3 text-[13px] text-neutral-600 hover:bg-neutral-50"
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
