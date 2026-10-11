import { loadWorkspaceShell } from "@/lib/server/auth/session";
import { DeliveryDetail } from "@/features/developer/components/webhooks/delivery-detail";

export const metadata = {
  title: "Delivery Diagnostics — QuickStart AI",
  description: "Inspect webhook delivery details and retry attempts.",
};

type Props = {
  params: {
    workspaceId: string;
    webhookId: string;
    deliveryId: string;
  };
};

export default async function WorkspaceDeliveryDetailPage({ params }: Props) {
  const { activeWorkspace } = await loadWorkspaceShell(params.workspaceId);

  return (
    <div className="w-full">
      <DeliveryDetail
        key={activeWorkspace.id}
        workspaceId={activeWorkspace.id}
        webhookId={params.webhookId}
        deliveryId={params.deliveryId}
        isPreview={false}
      />
    </div>
  );
}
