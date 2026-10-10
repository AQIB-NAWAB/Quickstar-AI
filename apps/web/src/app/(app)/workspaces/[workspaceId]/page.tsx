import Link from "next/link";
import { loadWorkspaceShell } from "@/lib/server/auth/session";

type Props = { params: { workspaceId: string } };

export default async function WorkspaceHomePage({ params }: Props) {
  const { activeWorkspace, me } = await loadWorkspaceShell(params.workspaceId);

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight text-accent-black">Overview</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Signed in as <span className="font-medium text-accent-black">{me.user.email}</span> in workspace{" "}
        <span className="font-medium text-accent-black">{activeWorkspace.name}</span>.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-16 border border-border-faint bg-white p-6 shadow-firecrawl-card">
          <h2 className="text-sm font-semibold text-accent-black">Inbox & handoff</h2>
          <p className="mt-2 text-xs text-neutral-500 leading-relaxed">
            Take conversations from the bot, reply as staff, and release back to automation.
          </p>
          <Link
            href={`/workspaces/${activeWorkspace.id}/inbox`}
            className="mt-4 inline-flex text-xs font-semibold text-heat-100 hover:underline"
          >
            Open inbox →
          </Link>
        </div>
        <div className="rounded-16 border border-border-faint bg-white p-6 shadow-firecrawl-card">
          <h2 className="text-sm font-semibold text-accent-black">Agents</h2>
          <p className="mt-2 text-xs text-neutral-500 leading-relaxed">
            Configure system prompts, select models, attach tools, and manage release versions.
          </p>
          <Link
            href={`/workspaces/${activeWorkspace.id}/agents`}
            className="mt-4 inline-flex text-xs font-semibold text-heat-100 hover:underline"
          >
            Manage agents →
          </Link>
        </div>
      </div>
    </div>
  );
}
