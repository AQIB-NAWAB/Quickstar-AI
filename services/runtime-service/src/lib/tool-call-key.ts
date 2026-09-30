export function buildToolCallKey(
  turnIdempotencyKey: string,
  round: number,
  toolName: string,
): string {
  return `${turnIdempotencyKey}:tool:${round}:${toolName}`;
}
