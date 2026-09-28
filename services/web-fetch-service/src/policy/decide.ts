import type { AcquisitionAction } from "@quickstart/contracts";
import type { AcquisitionProviderProfileView } from "../providers/registry.js";

export type PolicyInput = {
  action: AcquisitionAction;
  renderJs: boolean;
  profiles: AcquisitionProviderProfileView[];
  preferProfileIds?: string[];
};

export type PolicyDecision =
  | { allow: true; profileIds: string[]; reason: string }
  | { allow: false; reason: string };

export function decideAcquisitionProviders(input: PolicyInput): PolicyDecision {
  const enabled = input.profiles.filter((p) => p.enabled);
  if (enabled.length === 0) {
    return { allow: false, reason: "no_enabled_profiles" };
  }

  if (input.action === "search") {
    const searchCapable = enabled.filter(
      (p) => p.driver === "olostep" || p.driver === "fake",
    );
    const ordered = orderProfiles(searchCapable, input.preferProfileIds);
    if (ordered.length === 0) {
      return { allow: false, reason: "no_search_provider" };
    }
    return { allow: true, profileIds: ordered.map((p) => p.id), reason: "search" };
  }

  if (input.renderJs) {
    const js = enabled.filter((p) => p.driver === "olostep" || p.driver === "fake");
    const ordered = orderProfiles(js, input.preferProfileIds);
    if (ordered.length === 0) {
      return { allow: false, reason: "render_js_requires_olostep" };
    }
    return { allow: true, profileIds: ordered.map((p) => p.id), reason: "render_js" };
  }

  const directFirst = enabled.filter((p) => p.driver === "direct_http" || p.driver === "fake");
  const fallback = enabled.filter((p) => p.driver === "olostep" || p.driver === "fake");
  const chain = [
    ...orderProfiles(directFirst, input.preferProfileIds),
    ...orderProfiles(
      fallback.filter((p) => !directFirst.some((d) => d.id === p.id)),
      input.preferProfileIds,
    ),
  ];
  const unique = dedupeById(chain);
  if (unique.length === 0) {
    return { allow: false, reason: "no_scrape_provider" };
  }
  return { allow: true, profileIds: unique.map((p) => p.id), reason: "scrape_direct_then_fallback" };
}

function orderProfiles(
  profiles: AcquisitionProviderProfileView[],
  prefer?: string[],
): AcquisitionProviderProfileView[] {
  const sorted = [...profiles].sort((a, b) => a.priority - b.priority);
  if (!prefer?.length) return sorted;
  const preferSet = new Set(prefer);
  const preferred = sorted.filter((p) => preferSet.has(p.id));
  const rest = sorted.filter((p) => !preferSet.has(p.id));
  return [...preferred, ...rest];
}

function dedupeById(profiles: AcquisitionProviderProfileView[]): AcquisitionProviderProfileView[] {
  const seen = new Set<string>();
  const out: AcquisitionProviderProfileView[] = [];
  for (const p of profiles) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    out.push(p);
  }
  return out;
}
