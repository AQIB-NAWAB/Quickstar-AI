export type {
  IntegrationAuthorizeResponse,
  IntegrationCatalogItem,
  IntegrationCategory,
  IntegrationProvider,
  IntegrationsListResponse,
  IntegrationStatus,
} from "@quickstart/contracts";

export type RepositoryResult<T> =
  | { status: "ready"; data: T }
  | { status: "loading" }
  | { status: "unavailable"; message: string }
  | { status: "forbidden"; message: string }
  | { status: "error"; message: string };
