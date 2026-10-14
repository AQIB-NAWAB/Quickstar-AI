interface QualificationIndicatorProps {
  score: number | null | undefined;
  max?: number | null | undefined;
  isCompact?: boolean;
  className?: string;
}

export function QualificationIndicator({
  score,
  max = 100,
  isCompact = false,
  className = "",
}: QualificationIndicatorProps) {
  if (score === null || score === undefined || !Number.isFinite(score)) {
    return <span className="text-xs text-neutral-400">Not scored</span>;
  }

  const effectiveMax = max !== null && max !== undefined && max > 0 ? max : 100;
  // Compute actual ratio and clamp visual fill between 0% and 100%
  const percentage = Math.min(100, Math.max(0, (score / effectiveMax) * 100));

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="text-xs font-semibold text-neutral-900 tabular-nums">
        <span>{score}</span>
        <span className="text-neutral-400 font-normal"> / {effectiveMax}</span>
      </div>

      <div
        className={`rounded-full bg-neutral-200 overflow-hidden ${
          isCompact ? "w-28 h-1.5" : "w-32 sm:w-36 h-2"
        }`}
        role="progressbar"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={effectiveMax}
        aria-label={`Qualification score ${score} out of ${effectiveMax}`}
      >
        <div
          className="h-full bg-heat-100 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
