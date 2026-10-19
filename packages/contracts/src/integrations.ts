/**
 * Workspace Integrations Catalog and OAuth Contracts
 */

export const INTEGRATION_PROVIDERS = [
  "google_calendar",
  "hubspot",
  "salesforce",
  "slack",
  "twilio",
  "zendesk",
  "google_sheets",
  "notion",
  "mailchimp",
] as const;

export type IntegrationProvider = (typeof INTEGRATION_PROVIDERS)[number];

export const INTEGRATION_CATEGORIES = [
  "all",
  "crm_leads",
  "calendar_booking",
  "communication",
  "telephony",
  "productivity",
  "marketing",
] as const;

export type IntegrationCategory = (typeof INTEGRATION_CATEGORIES)[number];

export type IntegrationStatus =
  | "not_connected"
  | "connecting"
  | "connected"
  | "needs_reauthorization"
  | "incomplete"
  | "error";

export type IntegrationCatalogItem = {
  id: IntegrationProvider;
  name: string;
  category: IntegrationCategory;
  categoryLabel: string;
  description: string;
  connectionType: "oauth" | "credentials";
  status: IntegrationStatus;
  accountIdentifier?: string | null;
  accountEmail?: string | null;
  grantedScopes?: string[];
  connectedAt?: string | null;
  updatedAt?: string | null;
  requiredScopes?: string[];
};

export type IntegrationAuthorizeResponse = {
  authorization_url: string;
  state: string;
  provider: IntegrationProvider;
};

export type IntegrationsListResponse = {
  connected_count: number;
  catalog: IntegrationCatalogItem[];
  categories: {
    id: string;
    label: string;
    count: number;
  }[];
};
