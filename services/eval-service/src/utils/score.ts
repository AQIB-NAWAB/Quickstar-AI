/** Trimmed exact-match scoring for Feature 25 Done when (fake model scripted replies). */
export function scoreExactMatch(expected: string, actual: string | null | undefined): boolean {
  return (actual ?? "").trim() === expected.trim();
}

export function meanScorePercent(passedCount: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((passedCount / total) * 10000) / 100;
}
