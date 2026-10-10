const STORAGE_PREFIX = "quickstart.onboarding.complete.v1";

export function onboardingStorageKey(workspaceId: string): string {
  return `${STORAGE_PREFIX}.${workspaceId}`;
}

export function isOnboardingComplete(workspaceId: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return localStorage.getItem(onboardingStorageKey(workspaceId)) === "1";
}

export function markOnboardingComplete(workspaceId: string): void {
  localStorage.setItem(onboardingStorageKey(workspaceId), "1");
}

export function onboardingPath(workspaceId: string, welcome = false): string {
  return welcome
    ? `/workspaces/${workspaceId}/onboarding?welcome=1`
    : `/workspaces/${workspaceId}/onboarding`;
}

export function workspaceHomePath(workspaceId: string): string {
  return `/workspaces/${workspaceId}`;
}

/** Parse `/workspaces/{uuid}` from an auth redirect path. */
export function workspaceIdFromRedirect(redirect: string | undefined): string | null {
  if (!redirect) {
    return null;
  }
  const match = redirect.match(/^\/workspaces\/([0-9a-f-]{36})/i);
  return match?.[1] ?? null;
}

export function resolvePostAuthRedirect(
  workspaceId: string,
  options?: { isNewAccount?: boolean },
): string {
  if (options?.isNewAccount || !isOnboardingComplete(workspaceId)) {
    return onboardingPath(workspaceId, Boolean(options?.isNewAccount));
  }
  return workspaceHomePath(workspaceId);
}
