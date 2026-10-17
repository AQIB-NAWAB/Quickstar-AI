"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  Brain,
  ChevronDown,
  Code2,
  ClipboardList,
  Compass,
  Cable,
  FileText,
  HelpCircle,
  LogOut,
  Menu,
  MessageSquare,
  Megaphone,
  Phone,
  Plus,
  Send,
  Settings,
  UsersRound,
  Workflow,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type ComponentType } from "react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { AgentOutlineIcon } from "@/components/brand/agent-outline-icon";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { NotificationsProvider } from "@/features/notifications/context/notifications-context";
import { CreateWorkspaceDialog } from "./create-workspace-dialog";
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
  icon: ComponentType<{ className?: string; size?: number | string }>;
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
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [createWorkspaceOpen, setCreateWorkspaceOpen] = useState(false);
  const workspaceMenuRef = useRef<HTMLDivElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const isInbox = pathname.includes("/inbox");
  const base = `/workspaces/${workspaceId}`;
  const route = (path: string) => (isPreview ? `/preview/${path}` : `${base}/${path}`);

  const sections: NavSection[] = [
    {
      label: "BUILD",
      items: [
        { name: "Agents", href: route("agents"), icon: AgentOutlineIcon, match: "/agents" },
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
      label: "OPERATE",
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
      label: "WORKSPACE",
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
    if (item.name === "Agents" && (activePath.includes("/agents") || activePath.includes("/agents/"))) return true;
    if (item.name === "Campaigns" && activePath.includes("/campaigns")) return true;
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
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setAccountMenuOpen(false);
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

  const initials = userEmail ? userEmail.slice(0, 2).toUpperCase() : "QS";

  // Derive breadcrumbs matching 1.png and 2.png
  let breadcrumbParent = workspaceName;
  let breadcrumbChild = activeItem?.name || "Agents";
  let breadcrumbSubChild: string | null = null;

  if (activePath.includes("/agents/")) {
    const parts = activePath.split("/agents/");
    if (parts[1] && parts[1] !== "new") {
      breadcrumbParent = workspaceName;
      breadcrumbChild = "Agents";
      // In editor: breadcrumb shows Workspace / Agents / Agent Name
      breadcrumbSubChild = null; // child is populated with actual name in editor header if desired, or "Agents"
    }
  }

  return (
    <NotificationsProvider workspaceId={workspaceId} isPreview={isPreview}>
      <div className="staff-shell min-h-screen bg-[#F8F9FB] text-[#202125] flex font-sans antialiased">
        {/* Black Global Sidebar (~296px wide desktop) matching Open agent button */}
        <aside className="hidden xl:flex sticky top-0 h-[100dvh] shrink-0 w-[296px] bg-black flex-col justify-between p-4 select-none border-r border-[#1F1F23] z-20">
          <div className="flex flex-col min-h-0 flex-1">
            {/* Top Brand Lockup with Animated Logo */}
            <div className="px-3 py-3 mb-3">
              <Link
                href={route("agents")}
                className="flex items-center gap-2.5 text-[20px] font-bold tracking-tight"
              >
                <BrandLogo
                  size={24}
                  animated={true}
                  paused={false}
                  mood="idle"
                  fillColor="#FF571A"
                  className="w-6 h-6 shrink-0"
                />
                <span className="text-[#F2F4F7]">
                  QuickStart<span className="text-[#FF571A]"> AI</span>
                </span>
              </Link>
            </div>

            {/* Workspace Selector matching 1.png */}
            <div className="relative px-2 mb-4" ref={workspaceMenuRef}>
              <button
                type="button"
                onClick={() => setWorkspaceMenuOpen((v) => !v)}
                aria-expanded={workspaceMenuOpen}
                aria-label="Switch workspace"
                className="w-full flex items-center justify-between gap-2.5 rounded-lg border border-[#222225] bg-black px-3 py-2 text-left hover:border-[#383B43] hover:bg-[#141416] transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText className="w-4 h-4 text-[#B6C0C9] shrink-0" />
                  <span className="block truncate text-[14px] font-medium text-[#F2F4F7] leading-tight">
                    {workspaceName}
                  </span>
                </div>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-[#B6C0C9] transition-transform ${
                    workspaceMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {workspaceMenuOpen && (
                <div className="absolute left-2 right-2 top-[calc(100%+6px)] z-40 max-h-80 overflow-hidden rounded-lg border border-[#222225] bg-black py-1 shadow-2xl flex flex-col">
                  <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#8B98A5] shrink-0">
                    Workspaces ({workspaces.length})
                  </div>
                  <div className="max-h-48 overflow-y-auto divide-y divide-[#222225]">
                    {workspaces.map((ws) => (
                      <Link
                        key={ws.id}
                        href={`/workspaces/${ws.id}/agents`}
                        onClick={() => setWorkspaceMenuOpen(false)}
                        className={`flex items-center justify-between px-3 py-2 text-[14px] font-medium transition-colors hover:bg-[#141416] ${
                          ws.id === workspaceId
                            ? "bg-[#18181B] font-semibold text-[#FF571A]"
                            : "text-[#F2F4F7]"
                        }`}
                      >
                        <span className="truncate">{ws.name}</span>
                        {ws.id === workspaceId && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#FF571A] shrink-0" />
                        )}
                      </Link>
                    ))}
                  </div>

                  <div className="my-1 border-t border-[#222225] shrink-0" />

                  <button
                    type="button"
                    onClick={() => {
                      setWorkspaceMenuOpen(false);
                      setCreateWorkspaceOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[13px] font-semibold text-[#FF571A] hover:bg-[#141416] transition-colors shrink-0 text-left"
                  >
                    <Plus className="w-4 h-4 shrink-0" />
                    <span>Create new workspace</span>
                  </button>

                  <Link
                    href="/workspaces"
                    onClick={() => setWorkspaceMenuOpen(false)}
                    className="flex items-center justify-between px-3 py-1.5 text-[12px] text-[#B6C0C9] hover:text-[#F2F4F7] hover:bg-[#141416] transition-colors shrink-0"
                  >
                    <span>View all workspaces</span>
                    <span className="font-mono text-[11px]">→</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Navigation Groups: BUILD, OPERATE, WORKSPACE */}
            <nav aria-label="Workspace sections" className="flex-1 overflow-y-auto px-2 space-y-5 pr-2">
              {sections.map((section) => (
                <section key={section.label}>
                  <h2 className="px-2.5 pb-1 text-[11px] font-semibold tracking-wider text-[#8B98A5] uppercase">
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
                          className={`relative flex items-center gap-3 px-3 py-2 rounded-md text-[14px] font-medium transition-colors ${
                            active
                              ? "bg-[#18181B] text-[#F2F4F7] font-semibold"
                              : "text-[#B6C0C9] hover:bg-[#141416] hover:text-[#F2F4F7]"
                          }`}
                        >
                          {active && (
                            <span
                              className="absolute left-0 top-1 bottom-1 w-[3px] bg-[#FF571A] rounded-r"
                              aria-hidden="true"
                            />
                          )}
                          <ItemIcon
                            className={`w-4 h-4 shrink-0 ${active ? "text-[#F2F4F7]" : "text-[#B6C0C9]"}`}
                          />
                          <span className="truncate">{item.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              ))}
            </nav>
          </div>

          {/* Lower Sidebar Utility Area: Settings & Account */}
          <div className="pt-3 px-2 border-t border-[#222225] space-y-1">
            <Link
              href={route("settings")}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-[14px] font-medium transition-colors ${
                activePath.includes("/settings")
                  ? "bg-[#18181B] text-[#F2F4F7] font-semibold"
                  : "text-[#B6C0C9] hover:bg-[#141416] hover:text-[#F2F4F7]"
              }`}
            >
              <Settings className="w-4 h-4 text-[#B6C0C9] shrink-0" />
              <span>Settings</span>
            </Link>

            <div className="relative pt-1" ref={accountMenuRef}>
              <button
                type="button"
                onClick={() => setAccountMenuOpen((v) => !v)}
                className="w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-md hover:bg-[#141416] transition-colors text-left"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full border border-[#383B43] bg-[#18181B] text-[#F2F4F7] flex items-center justify-center font-semibold text-[11px] shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-[#F2F4F7] truncate leading-tight">
                      Workspace owner
                    </p>
                    <p className="text-[11px] text-[#8B98A5] leading-tight mt-0.5">Manage account</p>
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-[#8B98A5] shrink-0" />
              </button>

              {accountMenuOpen && (
                <div className="absolute left-0 right-0 bottom-[calc(100%+6px)] z-40 rounded-lg border border-[#222225] bg-black py-1 shadow-2xl">
                  <div className="px-3 py-2 text-[12px] text-[#B6C0C9] border-b border-[#222225] truncate">
                    {userEmail || "Signed in"}
                  </div>
                  <button
                    type="button"
                    onClick={() => void logout()}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[12px] font-medium text-[#F87171] hover:bg-[#18181B] transition-colors text-left"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Main Workspace (Light #F8F9FB background with ~70px Top Bar) */}
        <div className="flex-1 flex flex-col min-w-0 h-[100dvh] overflow-hidden bg-[#F8F9FB]">
          {/* Top Bar with Breadcrumbs & Global Controls (~70px height) matching 1.png / 2.png */}
          <header className="h-[70px] px-6 sm:px-8 border-b border-[#EAECF0] flex items-center justify-between shrink-0 bg-white">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                className="xl:hidden p-2 rounded-lg border border-[#DCE1E8] text-[#667085] hover:bg-[#F8F9FA]"
                aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"}
                onClick={() => setMobileNavOpen((v) => !v)}
              >
                {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[14px] text-[#667085]">
                <span>{breadcrumbParent}</span>
                <span className="text-[#DCE1E8]">/</span>
                <span className="font-semibold text-[#202125] truncate">{breadcrumbChild}</span>
                {breadcrumbSubChild && (
                  <>
                    <span className="text-[#DCE1E8]">/</span>
                    <span className="font-semibold text-[#202125] truncate">{breadcrumbSubChild}</span>
                  </>
                )}
              </nav>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                title="Documentation & help"
                onClick={() => router.push(route("developer"))}
                className="p-2 text-[#667085] hover:text-[#202125] hover:bg-[#F8F9FA] rounded-md transition-colors"
                aria-label="Help and documentation"
              >
                <HelpCircle className="w-5 h-5" />
              </button>
              <NotificationBell workspaceId={workspaceId} isPreview={isPreview} />
            </div>
          </header>

          {/* Mobile Navigation Drawer */}
          {mobileNavOpen && (
            <nav
              id="workspace-mobile-navigation"
              aria-label="Workspace navigation"
              className="xl:hidden fixed inset-x-0 top-[70px] bottom-0 z-50 overflow-y-auto border-t border-[#222225] bg-black p-4 shadow-2xl"
            >
              <div className="space-y-4">
                {sections.map((section) => (
                  <section key={section.label}>
                    <h2 className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[#8B98A5]">
                      {section.label}
                    </h2>
                    <div className="grid grid-cols-2 gap-1.5">
                      {section.items.map((item) => {
                        const ItemIcon = item.icon;
                        const active = isItemActive(item);
                        return (
                          <Link
                            key={item.name}
                            href={item.href}
                            onClick={() => setMobileNavOpen(false)}
                            className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-[14px] font-medium ${
                              active
                                ? "bg-[#18181B] text-[#F2F4F7] font-semibold"
                                : "text-[#B6C0C9] hover:bg-[#141416]"
                            }`}
                          >
                            <ItemIcon
                              className={`h-4 w-4 shrink-0 ${active ? "text-[#FF571A]" : "text-[#B6C0C9]"}`}
                            />
                            <span className="truncate">{item.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </section>
                ))}
                <div className="pt-3 border-t border-[#222225]">
                  <button
                    type="button"
                    onClick={() => void logout()}
                    className="w-full flex items-center justify-center gap-2 rounded-md px-3 py-2.5 text-[14px] font-medium text-[#F87171] bg-[#141416] hover:bg-[#18181B]"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </div>
            </nav>
          )}

          {/* Main Content Area */}
          <main
            className={`flex-1 min-w-0 flex flex-col ${
              isInbox ? "overflow-hidden" : "overflow-y-auto"
            }`}
          >
            <div
              className={
                isInbox
                  ? "flex-1 flex flex-col min-h-0 w-full"
                  : "p-4 sm:p-6 lg:p-8 max-w-[1586px] w-full mx-auto"
              }
            >
              {children}
            </div>
          </main>
        </div>
      </div>

      <CreateWorkspaceDialog
        isOpen={createWorkspaceOpen}
        onClose={() => setCreateWorkspaceOpen(false)}
      />
    </NotificationsProvider>
  );
}
