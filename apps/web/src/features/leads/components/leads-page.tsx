"use client";

import Link from "next/link";
import { Download } from "lucide-react";
import { usePathname,useRouter,useSearchParams } from "next/navigation";
import { useEffect,useMemo,useState } from "react";
import { filterLeads } from "../lib/filters";
import { getLeadsRepository } from "../lib/repository";
import type { LeadDetail,LeadStatus,LeadSummary } from "../lib/types";
import { CsvExportDialog } from "./csv-export-dialog";
import { LeadDetailDrawer } from "./lead-detail-drawer";
import { LeadFilters } from "./lead-filters";
import { LeadTable } from "./lead-table";

interface LeadsPageProps {
  workspaceId: string;
  workspaceSlug?: string;
  isSampleData?: boolean;
}

export function LeadsPage({
  workspaceId,
  workspaceSlug = "acme-support",
  isSampleData = false,
}: LeadsPageProps) {
  // Construct on the client — class instances cannot cross the RSC boundary.
  const repository = useMemo(() => getLeadsRepository(isSampleData), [isSampleData]);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // URL state synchronization
  const initialQ = searchParams?.get("q") || "";
  const initialStatus = searchParams?.get("status") || "all";
  const initialTag = searchParams?.get("tag") || "all";
  const initialLeadId = searchParams?.get("lead") || (isSampleData ? "lead_1042" : null);

  const [q, setQ] = useState(initialQ);
  const [status, setStatus] = useState(initialStatus);
  const [tag, setTag] = useState(initialTag);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(initialLeadId);

  const [allLeads, setAllLeads] = useState<LeadSummary[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [selectedLeadDetail, setSelectedLeadDetail] = useState<LeadDetail | null>(null);

  const [isUnavailable, setIsUnavailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);

  // Sync URL query state when filters or lead selection change
  function updateUrl(newParams: { q?: string; status?: string; tag?: string; lead?: string | null }) {
    if (!searchParams) return;
    const params = new URLSearchParams(searchParams.toString());

    if (newParams.q !== undefined) {
      if (newParams.q.trim()) params.set("q", newParams.q.trim());
      else params.delete("q");
    }
    if (newParams.status !== undefined) {
      if (newParams.status !== "all") params.set("status", newParams.status);
      else params.delete("status");
    }
    if (newParams.tag !== undefined) {
      if (newParams.tag !== "all") params.set("tag", newParams.tag);
      else params.delete("tag");
    }
    if (newParams.lead !== undefined) {
      if (newParams.lead) params.set("lead", newParams.lead);
      else params.delete("lead");
    }

    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }

  // Initial load
  useEffect(() => {
    let active = true;
    const abortController = new AbortController();

    async function loadData() {
      try {
        setLoading(true);
        const res = await repository.listLeads(workspaceId, {}, abortController.signal);

        if (!active) return;

        if (res.status === "unavailable") {
          setIsUnavailable(true);
          setLoading(false);
          return;
        }

        if (res.status === "ready") {
          setAllLeads(res.data.leads);
          setAvailableTags(res.data.availableTags);
          setIsUnavailable(false);
        }
        setLoading(false);
      } catch (err: unknown) {
        if (!active || (err instanceof Error && err.name === "AbortError")) {
          return;
        }
        setLoading(false);
      }
    }

    loadData();

    return () => {
      active = false;
      abortController.abort();
    };
  }, [repository, workspaceId]);

  // Load detail for selected lead
  useEffect(() => {
    let active = true;
    const abortController = new AbortController();

    async function loadLeadDetail() {
      if (!selectedLeadId) {
        setSelectedLeadDetail(null);
        return;
      }

      try {
        const res = await repository.getLead(workspaceId, selectedLeadId, abortController.signal);
        if (!active) return;

        if (res.status === "ready") {
          setSelectedLeadDetail(res.data);
        } else {
          setSelectedLeadDetail(null);
        }
      } catch (err: unknown) {
        if (!active || (err instanceof Error && err.name === "AbortError")) {
          return;
        }
      }
    }

    loadLeadDetail();

    return () => {
      active = false;
      abortController.abort();
    };
  }, [repository, workspaceId, selectedLeadId]);

  // Filter leads client-side
  const filteredLeads = useMemo(() => {
    return filterLeads(allLeads, { q, status, tag });
  }, [allLeads, q, status, tag]);

  // Check if selected lead is outside currently filtered leads
  const isSelectedOutsideFilter = useMemo(() => {
    if (!selectedLeadId) return false;
    return !filteredLeads.some((l) => l.id === selectedLeadId);
  }, [filteredLeads, selectedLeadId]);

  // Update lead status
  async function handleUpdateStatus(newStatus: LeadStatus) {
    if (!selectedLeadId) return;

    const res = await repository.updateLeadStatus(
      workspaceId,
      selectedLeadId,
      newStatus,
      selectedLeadDetail?.version
    );

    if (res.status === "ready") {
      setSelectedLeadDetail(res.data);
      setAllLeads((prev) =>
        prev.map((l) => (l.id === selectedLeadId ? { ...l, status: newStatus } : l))
      );
    }
  }

  // Filter change handlers
  function handleSearchChange(newQ: string) {
    setQ(newQ);
    updateUrl({ q: newQ });
  }

  function handleStatusChange(newStatus: string) {
    setStatus(newStatus);
    updateUrl({ status: newStatus });
  }

  function handleTagChange(newTag: string) {
    setTag(newTag);
    updateUrl({ tag: newTag });
  }

  function handleClearFilters() {
    setQ("");
    setStatus("all");
    setTag("all");
    updateUrl({ q: "", status: "all", tag: "all" });
  }

  function handleSelectLead(leadId: string) {
    setSelectedLeadId(leadId);
    updateUrl({ lead: leadId });
  }

  function handleCloseDrawer() {
    setSelectedLeadId(null);
    updateUrl({ lead: null });
  }

  // Render Unavailable State for production without service
  if (isUnavailable) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-faint">
          <div>
            <h1 className="text-2xl font-bold text-accent-black tracking-tight">
              Leads
            </h1>
            <p className="text-xs text-neutral-500 mt-1">
              Review captured contacts, intent, and qualification.
            </p>
          </div>
        </div>

        <div className="bg-white border border-border-faint rounded-12 p-8 sm:p-12 text-center max-w-xl mx-auto my-8 space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mx-auto text-neutral-500">
            <span className="text-xl">👥</span>
          </div>
          <h2 className="text-base font-bold text-accent-black tracking-tight">
            Lead management is not available yet.
          </h2>
          <p className="text-xs text-neutral-500 max-w-md mx-auto leading-relaxed">
            This workspace’s lead service is not connected. Lead capture, qualification scoring, and CRM export APIs are pending backend implementation.
          </p>
          <div className="pt-2">
            <p className="text-[11px] font-mono text-neutral-400">
              See apps/web/src/features/leads/BACKEND_DEPENDENCIES.md for contracts.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-faint">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-accent-black tracking-tight">
              Leads
            </h1>
            {isSampleData && (
              <span className="border border-orange-200 bg-orange-50/50 text-heat-100 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                Sample data
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Review captured contacts, intent, and qualification.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setExportOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-6 text-xs font-semibold border border-neutral-300 bg-white hover:bg-neutral-50 text-accent-black shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-neutral-600" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {loading && <p role="status" className="text-xs text-neutral-500">Loading leads…</p>}

      {/* Toolbar: Search & Filters */}
      <LeadFilters
        search={q}
        status={status}
        tag={tag}
        availableTags={availableTags}
        totalLoaded={filteredLeads.length}
        isSampleData={isSampleData}
        onSearchChange={handleSearchChange}
        onStatusChange={handleStatusChange}
        onTagChange={handleTagChange}
        onClearFilters={handleClearFilters}
      />

      {/* Main Content Area: Full-width Table */}
      <div className="w-full">
        <LeadTable
          leads={filteredLeads}
          selectedLeadId={selectedLeadId}
          isSampleData={isSampleData}
          onSelectLead={handleSelectLead}
        />
      </div>

      {/* Slide-over Detail Drawer / Sidebar (Off-canvas Overlay) */}
      {selectedLeadDetail && (
        <LeadDetailDrawer
          lead={selectedLeadDetail}
          workspaceId={workspaceId}
          isPreview={isSampleData}
          isOutsideFilter={isSelectedOutsideFilter}
          onClose={handleCloseDrawer}
          onUpdateStatus={handleUpdateStatus}
        />
      )}

      {/* CSV Export Dialog */}
      <CsvExportDialog
        open={exportOpen}
        leads={filteredLeads}
        workspaceSlug={workspaceSlug}
        onClose={() => setExportOpen(false)}
      />
    </div>
  );
}
