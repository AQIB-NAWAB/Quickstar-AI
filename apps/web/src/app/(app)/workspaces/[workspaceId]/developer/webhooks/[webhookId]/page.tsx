import { loadWorkspaceShell } from "@/lib/server/auth/session";
import { WebhookList } from "@/features/developer/components/webhooks/webhook-list";

export const metadata = {
  title: "Webhook Endpoint — QuickStart AI",
  description: "View and configure webhook endpoint.",
};

type Props = {
  params: { workspaceId: string; webhookId: string };
};

export default async function WorkspaceWebhookDetailPage({ params }: Props) {
  const { activeWorkspace } = await loadWorkspaceShell(params.workspaceId);

  return (
    <div className="w-full">
      <WebhookList
        key={activeWorkspace.id}
        workspaceId={activeWorkspace.id}
        isPreview={false}
      />
    </div>
  );
}
