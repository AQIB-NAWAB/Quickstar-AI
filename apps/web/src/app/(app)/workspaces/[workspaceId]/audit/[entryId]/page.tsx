import Link from "next/link";
import { ArrowLeft, AlertCircle, FileClock } from "lucide-react";
import { loadWorkspaceShell } from "@/lib/server/auth/session";
import { AuditEntryDetail } from "@/features/audit/components/audit-entry-detail";
import { getAuditRepository } from "@/features/audit/lib/repository";

export const metadata = {
  title: "Audit Entry Details — QuickStart AI",
  description: "Inspect metadata and changes for this audit entry.",
};

type Props = {
  params: { workspaceId: string; entryId: string };
};

export default async function WorkspaceAuditEntryPage({ params }: Props) {
  const { activeWorkspace } = await loadWorkspaceShell(params.workspaceId);
  const repo = getAuditRepository(false);
  const backUrl = `/workspaces/${encodeURIComponent(activeWorkspace.id)}/audit`;

  const res = await repo.getEntry(activeWorkspace.id, params.entryId);

  if (res.status === "unavailable") {
    return (
      <div className="space-y-4 max-w-xl mx-auto my-8">
        <Link
          href={backUrl}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-accent-black transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Audit log
        </Link>
        <div className="bg-white border border-border-faint rounded-12 p-8 shadow-xs text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center mx-auto text-neutral-500">
            <FileClock className="w-5 h-5" />
          </div>
          <h2 className="text-sm font-bold text-accent-black">
            Audit logging is not available yet.
          </h2>
          <p className="text-xs text-neutral-500 leading-relaxed">
            {res.message || "This workspace’s audit logging engine is not connected."}
          </p>
          <div className="pt-2">
            <Link
              href={`/preview/audit/${params.entryId}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-heat-100 hover:text-heat-200 transition-colors"
            >
              Explore sample audit entry in visual preview &rarr;
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (res.status !== "ready") {
    return (
      <div className="space-y-4 max-w-xl mx-auto my-8">
        <Link
          href={backUrl}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-accent-black"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Audit log
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-12 p-6 text-center space-y-2">
          <AlertCircle className="w-5 h-5 text-red-600 mx-auto" />
          <h2 className="text-sm font-semibold text-red-900">Audit Entry Unavailable</h2>
          <p className="text-xs text-red-700">{res.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <AuditEntryDetail
        entry={res.data}
        isStandalone={true}
        backUrl={backUrl}
      />
    </div>
  );
}
