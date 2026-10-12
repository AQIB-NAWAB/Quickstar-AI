import { AppError, ErrorCode } from "@quickstart/errors";
import type { TelephonyProvider } from "./types.js";
import type { RouteDecision } from "./types.js";

export class TelephonyRouter {
  private readonly providers = new Map<string, TelephonyProvider>();
  /** workspaceId → preferred provider id order */
  private readonly preferences = new Map<string, string[]>();

  register(provider: TelephonyProvider): void {
    this.providers.set(provider.id, provider);
  }

  setWorkspacePreference(workspaceId: string, orderedProviderIds: string[]): void {
    this.preferences.set(workspaceId, orderedProviderIds);
  }

  list(): TelephonyProvider[] {
    return [...this.providers.values()];
  }

  async route(workspaceId: string, preferred?: string): Promise<RouteDecision> {
    const order =
      preferred != null
        ? [preferred, ...(this.preferences.get(workspaceId) ?? [])]
        : (this.preferences.get(workspaceId) ?? [...this.providers.keys()]);

    const seen = new Set<string>();
    let failoverFrom: string | undefined;

    for (const id of order) {
      if (seen.has(id)) continue;
      seen.add(id);
      const provider = this.providers.get(id);
      if (!provider) continue;
      const ok = await provider.healthy();
      if (ok) {
        return { provider, failoverFrom };
      }
      failoverFrom = id;
    }

    // Try any remaining registered provider.
    for (const provider of this.providers.values()) {
      if (seen.has(provider.id)) continue;
      if (await provider.healthy()) {
        return { provider, failoverFrom };
      }
      failoverFrom = provider.id;
    }

    throw new AppError({
      code: ErrorCode.UPSTREAM_UNAVAILABLE,
      message: "No healthy telephony provider available",
    });
  }
}
