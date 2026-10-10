import { loadWorkspaceShell } from "@/lib/auth/session";

type Props = { params: { workspaceId: string } };

export default async function InboxIndexPage({ params }: Props) {
  await loadWorkspaceShell(params.workspaceId);

  return (
    <div className="flex flex-1 items-center justify-center p-8 text-center">
      <div className="max-w-sm">
        <h2 className="text-sm font-bold text-accent-black">Select a conversation</h2>
        <p className="mt-2 text-xs text-neutral-500">
          Choose a thread from the list to read messages, take handoff, and reply as a human agent.
        </p>
      </div>
    </div>
  );
}
