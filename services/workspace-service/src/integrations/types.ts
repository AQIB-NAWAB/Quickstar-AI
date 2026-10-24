import type { IntegrationProvider, ProviderCapabilities } from "@quickstart/contracts";

export interface ProviderTokenResult {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType?: string;
  grantedScopes: string[];
  accountIdentifier: string;
  accountEmail?: string | null;
  accountName?: string | null;
  providerAccountId?: string | null;
  rawPayload?: Record<string, unknown>;
}

export interface ProviderCredentialsVerification {
  valid: boolean;
  accountIdentifier: string;
  accountEmail?: string | null;
  accountName?: string | null;
  providerAccountId?: string | null;
  grantedScopes?: string[];
  metadata?: Record<string, unknown>;
}

export interface ProviderSyncParams {
  accessToken: string;
  operation: string;
  resourceType?: string;
  options?: Record<string, unknown>;
}

export interface ProviderSyncResult {
  recordsSynced: number;
  resources?: Array<{ id: string; name: string; type: string; metadata?: Record<string, unknown> }>;
  details?: Record<string, unknown>;
}

export interface ProviderAdapter {
  readonly provider: IntegrationProvider;
  readonly capabilities: ProviderCapabilities;

  getAuthorizationUrl(params: {
    state: string;
    redirectUri: string;
    codeVerifier?: string;
    scopes?: string[];
    subdomain?: string;
  }): { url: string; codeChallenge?: string };

  exchangeCode(params: {
    code: string;
    redirectUri: string;
    codeVerifier?: string;
    subdomain?: string;
  }): Promise<ProviderTokenResult>;

  refreshToken?(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
  }>;

  verifyCredentials?(credentials: Record<string, string>): Promise<ProviderCredentialsVerification>;

  revokeToken?(token: string): Promise<void>;

  syncResource?(params: ProviderSyncParams): Promise<ProviderSyncResult>;
}
