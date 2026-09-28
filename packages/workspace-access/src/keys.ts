export function membershipCacheKey(workspaceId: string, userId: string): string {
  return `qs:membership:v1:${workspaceId}:${userId}`;
}
