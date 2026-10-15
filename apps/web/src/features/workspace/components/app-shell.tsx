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
import { useEffect, useRef, useState } from "react";
import { BrandLogo } from "@/components/brand/brand-logo";
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
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [createWorkspaceOpen, setCreateWorkspaceOpen] = useState(false);
  const workspaceMenuRef = useRef<HTMLDivElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const isInbox = pathname.includes("/inbox");
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

  const initials = userEmail ? userEmail.slice(0, 2).toUpperCase() : "US";
  const wsInitial = workspaceName ? workspaceName.charAt(0).toUpperCase() : "W";

  // Derive breadcrumb text
  let breadcrumbParent = "Workspace";
  let breadcrumbChild = activeItem?.name || "Agents";

  if (activePath.includes("/agents/")) {
    const parts = activePath.split("/agents/");
    if (parts[1] && parts[1] !== "new") {
      breadcrumbParent = "Agents";
      breadcrumbChild = "Editor";
    }
  } else if (activePath.includes("/lead-generation/profile")) {
    breadcrumbParent = "Lead generation";
    breadcrumbChild = "Business profile";
  } else if (activePath.includes("/lead-generation/runs/") && activePath.split("/lead-generation/runs/")[1]) {
    breadcrumbParent = "Lead generation";
    breadcrumbChild = "Research run";
  }

  return (
    <NotificationsProvider workspaceId={workspaceId} isPreview={isPreview}>
      <div className="staff-shell min-h-screen bg-[#F2F3F4] text-[#202125] flex font-sans antialiased">
        {/* Desktop Sidebar: 272px */}
        <aside className="hidden xl:flex sticky top-0 h-[calc(100dvh-var(--console-offset,0px))] shrink-0 w-[272px] bg-[#F2F3F4] flex-col justify-between p-4 pr-0 select-none">
          <div className="flex flex-col min-h-0 flex-1">
            {/* Logo */}
            <div className="px-3 py-2.5 mb-2">
              <Link
                href={route("agents")}
                className="flex items-center gap-2.5 text-[20px] font-bold tracking-tight text-[#202125]"
              >
                <BrandLogo className="w-6 h-6 shrink-0" />
                <span>
                  QuickStart<span className="text-[#F15A24]"> AI</span>
                </span>
              </Link>
            </div>

            {/* Workspace Selector */}
            <div className="relative px-2 mb-4" ref={workspaceMenuRef}>
              <button
                type="button"
                onClick={() => setWorkspaceMenuOpen((v) => !v)}
                aria-expanded={workspaceMenuOpen}
                aria-label="Switch workspace"
                className="w-full flex items-center justify-between gap-2.5 rounded-lg border border-[#E1E5EA] bg-white px-2.5 py-2 text-left shadow-xs hover:border-[#CCD2D8] transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-6 h-6 rounded bg-[#F8F9FA] border border-[#E1E5EA] text-[#202125] font-semibold text-[11px] flex items-center justify-center shrink-0">
                    {wsInitial}
                  </div>
                  <div className="min-w-0">
                    <span className="block truncate text-[14px] font-semibold text-[#202125] leading-tight">
                      {workspaceName}
                    </span>
                    <span className="block truncate text-[10px] font-mono text-[#667085] leading-tight">
                      {workspaceSlug}
                    </span>
                  </div>
                </div>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-[#667085] transition-transform ${
                    workspaceMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {workspaceMenuOpen && (
                <div className="absolute left-2 right-2 top-[calc(100%+6px)] z-40 max-h-80 overflow-hidden rounded-lg border border-[#E1E5EA] bg-white py-1 shadow-lg flex flex-col">
                  <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#98A2B3] shrink-0">
                    Workspaces ({workspaces.length})
                  </div>
                  <div className="max-h-48 overflow-y-auto divide-y divide-[#F2F4F7]">
                    {workspaces.map((ws) => (
                      <Link
                        key={ws.id}
                        href={`/workspaces/${ws.id}/agents`}
                        onClick={() => setWorkspaceMenuOpen(false)}
                        className={`flex items-center justify-between px-3 py-2 text-[14px] font-medium transition-colors hover:bg-[#F8F9FA] ${
                          ws.id === workspaceId
                            ? "bg-[#FFF3ED] font-semibold text-[#F15A24]"
                            : "text-[#202125]"
                        }`}
                      >
                        <span className="truncate">{ws.name}</span>
                        {ws.id === workspaceId && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#F15A24] shrink-0" />
                        )}
                      </Link>
                    ))}
                  </div>

                  <div className="my-1 border-t border-[#EDF0F2] shrink-0" />

                  <button
                    type="button"
                    onClick={() => {
                      setWorkspaceMenuOpen(false);
                      setCreateWorkspaceOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[13px] font-semibold text-[#F15A24] hover:bg-[#FFF3ED] transition-colors shrink-0 text-left"
                  >
                    <Plus className="w-4 h-4 shrink-0" />
                    <span>Create new workspace</span>
                  </button>

                  <Link
                    href="/workspaces"
                    onClick={() => setWorkspaceMenuOpen(false)}
                    className="flex items-center justify-between px-3 py-1.5 text-[12px] text-[#667085] hover:text-[#202125] hover:bg-[#F8F9FA] transition-colors shrink-0"
                  >
                    <span>View all workspaces</span>
                    <span className="font-mono text-[11px]">→</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Navigation Groups */}
            <nav aria-label="Workspace sections" className="flex-1 overflow-y-auto px-2 space-y-5 pr-3">
              {sections.map((section) => (
                <section key={section.label}>
                  <h2 className="px-2.5 pb-1 text-[12px] font-medium tracking-wide text-[#667085]">
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
                          className={`flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-[14px] font-medium transition-all ${
                            active
                              ? "bg-white text-[#202125] font-semibold border border-[#E1E5EA] shadow-xs"
                              : "text-[#475467] hover:bg-black/5 hover:text-[#202125]"
                          }`}
                        >
                          <ItemIcon
                            className={`w-4 h-4 shrink-0 ${active ? "text-[#F15A24]" : "text-[#667085]"}`}
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
          <div className="pt-2 px-2 border-t border-[#EDF0F2] space-y-1">
            <Link
              href={route("settings")}
              className={`flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-[14px] font-medium transition-colors ${
                activePath.includes("/settings")
                  ? "bg-white text-[#202125] font-semibold border border-[#E1E5EA] shadow-xs"
                  : "text-[#475467] hover:bg-black/5 hover:text-[#202125]"
              }`}
            >
              <Settings className="w-4 h-4 text-[#667085] shrink-0" />
              <span>Settings</span>
            </Link>

            <div className="relative pt-1" ref={accountMenuRef}>
              <button
                type="button"
                onClick={() => setAccountMenuOpen((v) => !v)}
                className="w-full flex items-center justify-between gap-2.5 px-2.5 py-2.5 rounded-lg hover:bg-black/5 transition-colors text-left"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-[#344054] text-white flex items-center justify-center font-semibold text-[10px] shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-[#202125] truncate leading-tight">
                      {userEmail || "QuickStart user"}
                    </p>
                    <p className="text-[10px] text-[#667085] leading-tight">Staff account</p>
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-[#667085] shrink-0" />
              </button>

              {accountMenuOpen && (
                <div className="absolute left-0 right-0 bottom-[calc(100%+6px)] z-40 rounded-lg border border-[#E1E5EA] bg-white py-1 shadow-lg">
                  <button
                    type="button"
                    onClick={() => void logout()}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[12px] font-medium text-[#B42318] hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Inset Main Pane */}
        <div className="flex-1 flex flex-col min-w-0 h-[calc(100dvh-var(--console-offset,0px))] overflow-hidden p-3 pl-3 xl:pl-2">
          <div className="bg-white border border-[#E1E5EA] rounded-[12px] flex-1 flex flex-col min-w-0 overflow-hidden shadow-xs">
            {/* Top Bar with Breadcrumbs & Global Controls */}
            <header className="h-14 px-6 border-b border-[#EDF0F2] flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  className="xl:hidden p-1.5 rounded-lg border border-[#E1E5EA] text-[#667085] hover:bg-[#F8F9FA]"
                  aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"}
                  onClick={() => setMobileNavOpen((v) => !v)}
                >
                  {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>

                <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[14px] text-[#667085]">
                  <span>{breadcrumbParent}</span>
                  <span className="text-[#CCD2D8]">/</span>
                  <span className="font-semibold text-[#202125] truncate">{breadcrumbChild}</span>
                </nav>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  title="Documentation & help"
                  onClick={() => router.push(route("developer"))}
                  className="p-1.5 text-[#667085] hover:text-[#202125] hover:bg-[#F8F9FA] rounded-md transition-colors"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
                <NotificationBell workspaceId={workspaceId} isPreview={isPreview} />
              </div>
            </header>

            {/* Mobile Navigation Drawer */}
            {mobileNavOpen && (
              <nav
                id="workspace-mobile-navigation"
                aria-label="Workspace navigation"
                className="xl:hidden fixed inset-x-0 top-14 bottom-0 z-50 overflow-y-auto border-t border-[#E1E5EA] bg-[#F2F3F4] p-4 shadow-xl"
              >
                <div className="space-y-4">
                  {sections.map((section) => (
                    <section key={section.label}>
                      <h2 className="px-2 pb-1 text-[11px] font-semibold text-[#667085]">
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
                              className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-[14px] font-medium ${
                                active
                                  ? "bg-white text-[#202125] font-semibold border border-[#E1E5EA] shadow-xs"
                                  : "text-[#475467] hover:bg-white/60"
                              }`}
                            >
                              <ItemIcon
                                className={`h-4 w-4 shrink-0 ${active ? "text-[#F15A24]" : "text-[#667085]"}`}
                              />
                              <span className="truncate">{item.name}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </section>
                  ))}
                  <div className="pt-2 border-t border-[#EDF0F2]">
                    <button
                      type="button"
                      onClick={() => void logout()}
                      className="w-full flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-[14px] font-medium text-[#B42318] bg-white border border-[#E1E5EA]"
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
                    : "p-5 sm:p-6 max-w-[1600px] mx-auto w-full"
                }
              >
                {children}
              </div>
            </main>
          </div>
        </div>
      </div>

      <CreateWorkspaceDialog
        isOpen={createWorkspaceOpen}
        onClose={() => setCreateWorkspaceOpen(false)}
      />
    </NotificationsProvider>
  );
}
