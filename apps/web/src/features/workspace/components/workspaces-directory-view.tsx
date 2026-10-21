"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Calendar, Layers, LogOut, Plus, Search, Settings } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { CreateWorkspaceDialog } from "./create-workspace-dialog";
import type { OrganizationItem, WorkspaceItem } from "../lib/types";

type Props = {
  initialWorkspaces: WorkspaceItem[];
  organizations: OrganizationItem[];
  userEmail: string;
};

export function WorkspacesDirectoryView({
  initialWorkspaces,
  organizations,
  userEmail,
}: Props) {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>(initialWorkspaces);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrgFilter, setSelectedOrgFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "recent">("recent");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const filteredWorkspaces = useMemo(() => {
    let list = [...workspaces];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (ws) =>
          ws.name.toLowerCase().includes(q) ||
          ws.slug.toLowerCase().includes(q) ||
          (ws.orgId && ws.orgId.toLowerCase().includes(q)),
      );
    }

    // Org filter
    if (selectedOrgFilter !== "all") {
      list = list.filter((ws) => (ws.orgId || ws.org_id) === selectedOrgFilter);
    }

    // Sort
    list.sort((a, b) => {
      if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      }
      const timeA = new Date(a.createdAt || a.created_at || 0).getTime();
      const timeB = new Date(b.createdAt || b.created_at || 0).getTime();
      return timeB - timeA;
    });

    return list;
  }, [workspaces, searchQuery, selectedOrgFilter, sortBy]);

  const initials = userEmail ? userEmail.slice(0, 2).toUpperCase() : "US";

  return (
    <div className="min-h-screen bg-[#F2F3F4] text-[#202125] flex flex-col font-sans antialiased">
      {/* Top Global Header */}
      <header className="h-16 px-6 bg-white border-b border-[#E1E5EA] flex items-center justify-between shrink-0 shadow-xs">
        <Link
          href="/workspaces"
          className="flex items-center gap-2.5 text-[20px] font-bold tracking-tight text-[#202125]"
        >
          <BrandLogo className="w-6 h-6 shrink-0" />
          <span>
            QuickStart<span className="text-[#F15A24]"> AI</span>
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#FFF3ED] border border-[#FFE2D4] text-[#F15A24] font-bold text-[12px] flex items-center justify-center shrink-0">
              {initials}
            </div>
            <span className="hidden sm:inline text-[13px] font-medium text-[#475467]">
              {userEmail}
            </span>
          </div>

          <div className="h-4 w-[1px] bg-[#E1E5EA]" />

          <button
            type="button"
            onClick={() => void handleLogout()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium text-[#B42318] hover:bg-red-50 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 p-6 md:p-10 max-w-6xl mx-auto w-full">
        {/* Page Heading & Primary CTA */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#E1E5EA]">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-[26px] font-bold text-[#202125] tracking-tight">
                Workspaces
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[12px] font-semibold bg-white border border-[#E1E5EA] text-[#475467] shadow-xs">
                {workspaces.length}
              </span>
            </div>
            <p className="mt-1 text-[14px] text-[#667085]">
              Select a workspace to manage AI agents and pipelines, or create a new one.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setCreateDialogOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#F15A24] text-white font-semibold text-[14px] hover:bg-[#D94B1B] shadow-xs transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create workspace</span>
          </button>
        </div>

        {/* Toolbar: Search, Filters, Sort */}
        <div className="py-6 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#98A2B3] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search workspaces by name or slug..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-[#E1E5EA] rounded-lg text-[14px] text-[#202125] placeholder:text-[#98A2B3] shadow-xs focus:outline-hidden focus:border-[#F15A24] focus:ring-2 focus:ring-[#F15A24]/20 transition-all"
            />
          </div>

          <div className="flex items-center gap-2.5">
            {organizations.length > 1 && (
              <select
                value={selectedOrgFilter}
                onChange={(e) => setSelectedOrgFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-[#E1E5EA] rounded-lg text-[13px] text-[#344054] shadow-xs focus:outline-hidden focus:border-[#F15A24]"
              >
                <option value="all">All organizations</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            )}

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "name" | "recent")}
              className="px-3 py-2 bg-white border border-[#E1E5EA] rounded-lg text-[13px] text-[#344054] shadow-xs focus:outline-hidden focus:border-[#F15A24]"
            >
              <option value="recent">Recently created</option>
              <option value="name">Alphabetical (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Workspace Cards Grid */}
        {filteredWorkspaces.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredWorkspaces.map((ws) => {
              const wsInitial = ws.name ? ws.name.charAt(0).toUpperCase() : "W";
              const createdDate = ws.createdAt || ws.created_at;
              const formattedDate = createdDate
                ? new Date(createdDate).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : null;

              return (
                <div
                  key={ws.id}
                  className="bg-white border border-[#E1E5EA] rounded-xl p-5 shadow-xs hover:border-[#CCD2D8] hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div>
                    {/* Card Top: Initials Icon + Role Pill */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-[#F8F9FA] border border-[#E1E5EA] text-[#202125] font-bold text-[16px] flex items-center justify-center shrink-0 group-hover:border-[#F15A24]/40 transition-colors">
                        {wsInitial}
                      </div>

                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#ECFDF3] text-[#027A48] border border-[#A6F4C5]">
                        {ws.role ? ws.role.charAt(0).toUpperCase() + ws.role.slice(1) : "Owner"}
                      </span>
                    </div>

                    {/* Workspace Title & Slug */}
                    <h2 className="text-[17px] font-bold text-[#202125] group-hover:text-[#F15A24] transition-colors truncate">
                      {ws.name}
                    </h2>
                    <p className="mt-0.5 text-[12px] font-mono text-[#667085] truncate">
                      /workspaces/{ws.slug}
                    </p>

                    {formattedDate && (
                      <div className="mt-3 flex items-center gap-1.5 text-[12px] text-[#98A2B3]">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Created {formattedDate}</span>
                      </div>
                    )}
                  </div>

                  {/* Card Bottom: Quick Actions */}
                  <div className="mt-5 pt-4 border-t border-[#EDF0F2] flex items-center justify-between">
                    <Link
                      href={`/workspaces/${ws.id}/settings`}
                      className="p-1.5 text-[#667085] hover:text-[#202125] hover:bg-neutral-100 rounded-md transition-colors"
                      title="Workspace settings"
                    >
                      <Settings className="w-4 h-4" />
                    </Link>

                    <Link
                      href={`/workspaces/${ws.id}/agents`}
                      className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#F15A24] group-hover:translate-x-0.5 transition-transform"
                    >
                      <span>Open workspace</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="p-12 text-center bg-white border border-[#E1E5EA] rounded-xl shadow-xs space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#FFF3ED] border border-[#FFE2D4] mx-auto flex items-center justify-center text-[#F15A24]">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-[17px] font-semibold text-[#202125]">
                {searchQuery ? "No matching workspaces" : "No workspaces yet"}
              </h3>
              <p className="mt-1 text-[14px] text-[#667085] max-w-sm mx-auto">
                {searchQuery
                  ? `No workspaces matched "${searchQuery}". Try clearing your search filter.`
                  : "Create your first workspace to start building AI agents, connecting tools, and managing conversations."}
              </p>
            </div>
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="px-4 py-2 text-[13px] font-semibold text-[#344054] bg-[#F8F9FA] border border-[#E1E5EA] rounded-lg hover:bg-neutral-100 transition-colors"
              >
                Clear search
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCreateDialogOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#F15A24] text-white font-semibold text-[14px] hover:bg-[#D94B1B] shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Create your first workspace</span>
              </button>
            )}
          </div>
        )}
      </main>

      {/* Create Workspace Modal */}
      <CreateWorkspaceDialog
        isOpen={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        organizations={organizations}
        onCreated={(newWs) => {
          setWorkspaces((prev) => [newWs, ...prev]);
        }}
      />
    </div>
  );
}
