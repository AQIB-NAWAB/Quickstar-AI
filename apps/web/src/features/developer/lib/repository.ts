import { developerPreviewStore } from "./preview-store";
import {
type RepositoryResult,
type WebhookDelivery,
type WebhookEndpoint,
type WebhooksRepository,
} from "./types";

export class ProductionWebhooksRepository implements WebhooksRepository {
  async listEndpoints(): Promise<RepositoryResult<WebhookEndpoint[]>> {
    return {
      status: "unavailable",
      message:
        "Webhook management service is not connected. Configure delivery pipeline in gateway.",
    };
  }

  async getEndpoint(): Promise<RepositoryResult<WebhookEndpoint>> {
    return {
      status: "unavailable",
      message: "Webhook management service is not connected.",
    };
  }

  async registerEndpoint(): Promise<
    RepositoryResult<{ endpoint: WebhookEndpoint; signingSecret: string }>
  > {
    return {
      status: "unavailable",
      message: "Webhook registration endpoint is not available yet.",
    };
  }

  async listDeliveries(): Promise<RepositoryResult<WebhookDelivery[]>> {
    return {
      status: "unavailable",
      message: "Webhook delivery audit service is not connected.",
    };
  }

  async getDelivery(): Promise<RepositoryResult<WebhookDelivery>> {
    return {
      status: "unavailable",
      message: "Webhook delivery audit service is not connected.",
    };
  }

  async redriveDelivery(): Promise<RepositoryResult<WebhookDelivery>> {
    return {
      status: "unavailable",
      message: "Webhook redrive capability is not available yet.",
    };
  }
}

export const productionWebhooksRepository = new ProductionWebhooksRepository();

export function getWebhooksRepository(isPreview = false): WebhooksRepository {
  if (isPreview) {
    return developerPreviewStore;
  }
  return productionWebhooksRepository;
}
