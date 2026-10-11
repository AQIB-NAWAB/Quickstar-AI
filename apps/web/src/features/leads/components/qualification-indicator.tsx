
interface QualificationIndicatorProps {
  score: number | null | undefined;
  max?: number | null | undefined;
  isCompact?: boolean;
}

export function QualificationIndicator({
  score,
  max,
  isCompact = false,
}: QualificationIndicatorProps) {
  if (score === null || score === undefined) {
    return <span className="text-xs text-neutral-400 font-mono">—</span>;
  }

  const hasScale = max !== null && max !== undefined && max > 0;
  const percentage = hasScale ? Math.min(100, Math.max(0, (score / max) * 100)) : null;

  return (
    <div className="space-y-1">
      <div className="text-xs font-bold text-accent-black tabular-nums">
        {score} {hasScale ? `/ ${max}` : ""}
      </div>
      {percentage !== null && (
        <div
          className={`rounded-full bg-neutral-200 overflow-hidden ${
            isCompact ? "w-20 h-2" : "w-28 h-2"
          }`}
          role="progressbar"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={max!}
          aria-label={`Qualification score ${score} out of ${max}`}
        >
          <div
            className="h-full bg-heat-100 rounded-full transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
}
