import { AppError, ErrorCode } from "@quickstart/errors";
import type { WebFetchConfig } from "../config/environment.js";
import { DirectHttpAcquisitionProvider } from "./direct-http.provider.js";
import { FakeAcquisitionProvider } from "./fake.provider.js";
import { OlostepAcquisitionProvider } from "./olostep.provider.js";
import type { AcquisitionProvider } from "./types.js";

export type ProviderRegistry = {
  get(profileId: string): AcquisitionProvider;
  listEnabledProfiles(): AcquisitionProviderProfileView[];
};

export type AcquisitionProviderProfileView = {
  id: string;
  driver: string;
  enabled: boolean;
  priority: number;
  unitCostMicrosScrape: number;
  unitCostMicrosSearch: number;
};

export function createProviderRegistry(config: WebFetchConfig): ProviderRegistry {
  const providers = new Map<string, AcquisitionProvider>();
  const views: AcquisitionProviderProfileView[] = [];

  for (const profile of config.providerProfiles) {
    let provider: AcquisitionProvider;
    switch (profile.driver) {
      case "fake":
        provider = new FakeAcquisitionProvider(profile.id);
        break;
      case "direct_http":
        provider = new DirectHttpAcquisitionProvider(profile, config);
        break;
      case "olostep":
        provider = new OlostepAcquisitionProvider(profile, config.scrapeTimeoutMs);
        break;
      default:
        throw new Error(`Unknown driver ${profile.driver as string} for profile ${profile.id}`);
    }
    providers.set(profile.id, provider);
    views.push({
      id: profile.id,
      driver: profile.driver,
      enabled: profile.enabled,
      priority: profile.priority,
      unitCostMicrosScrape: profile.unitCostMicrosScrape,
      unitCostMicrosSearch: profile.unitCostMicrosSearch,
    });
  }

  if (!providers.has("fake")) {
    const onlyCustomProfiles =
      config.providerProfiles.length > 0 &&
      !config.providerProfiles.some((profile) => profile.id === "fake");
    if (!onlyCustomProfiles) {
      providers.set("fake", new FakeAcquisitionProvider("fake"));
      views.push({
        id: "fake",
        driver: "fake",
        enabled: true,
        priority: 0,
        unitCostMicrosScrape: 0,
        unitCostMicrosSearch: 0,
      });
    }
  }

  return {
    get(profileId: string): AcquisitionProvider {
      const provider = providers.get(profileId);
      if (!provider) {
        throw new AppError({
          code: ErrorCode.VALIDATION_FAILED,
          message: `Unknown provider profile: ${profileId}`,
        });
      }
      return provider;
    },
    listEnabledProfiles(): AcquisitionProviderProfileView[] {
      return views.filter((v) => v.enabled).sort((a, b) => a.priority - b.priority);
    },
  };
}
