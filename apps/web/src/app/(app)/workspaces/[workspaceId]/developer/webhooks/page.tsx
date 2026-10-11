import { loadWorkspaceShell } from "@/lib/server/auth/session";
import { WebhookList } from "@/features/developer/components/webhooks/webhook-list";

export const metadata = {
  title: "Webhook Endpoints — QuickStart AI",
  description: "Configure and inspect webhook delivery.",
};

type Props = {
  params: { workspaceId: string };
};

export default async function WorkspaceWebhooksPage({ params }: Props) {
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
