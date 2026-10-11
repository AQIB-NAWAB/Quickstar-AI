"use client";

import { ApiReference } from "./api-reference/api-reference";
import { DeveloperHome } from "./developer-home";
import { SdkDocumentation } from "./sdk-documentation";
import { DeliveryDetail } from "./webhooks/delivery-detail";
import { WebhookList } from "./webhooks/webhook-list";

interface DeveloperPreviewViewProps {
  viewSegments: string[];
}

export function DeveloperPreviewView({
  viewSegments,
}: DeveloperPreviewViewProps) {
  // viewSegments[0] === "developer"
  const subview = viewSegments[1] || "";

  if (subview === "api-reference") {
    return <ApiReference workspaceId="local-preview" isPreview={true} />;
  }

  if (subview === "sdks") {
    return <SdkDocumentation workspaceId="local-preview" isPreview={true} />;
  }

  if (subview === "webhooks") {
    // Check if delivery detail
    // /preview/developer/webhooks/[webhookId]/deliveries/[deliveryId]
    const webhookId = viewSegments[2];
    const deliveriesSegment = viewSegments[3];
    const deliveryId = viewSegments[4];

    if (webhookId && deliveriesSegment === "deliveries" && deliveryId) {
      return (
        <DeliveryDetail
          workspaceId="local-preview"
          webhookId={webhookId}
          deliveryId={deliveryId}
          isPreview={true}
        />
      );
    }

    return <WebhookList workspaceId="local-preview" isPreview={true} />;
  }

  return <DeveloperHome workspaceId="local-preview" isPreview={true} />;
}
