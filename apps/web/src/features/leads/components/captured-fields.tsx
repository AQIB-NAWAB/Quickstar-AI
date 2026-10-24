interface CapturedFieldsProps {
  fields: Record<string, string | number | boolean | null | undefined>;
  /** Optional schema labels (key → display label). Falls back to the raw key. */
  labels?: Record<string, string>;
}

export function CapturedFields({ fields, labels }: CapturedFieldsProps) {
  const entries = Object.entries(fields).filter(([, v]) => v !== undefined);

  if (entries.length === 0) {
    return (
      <div className="space-y-1.5 pt-3 border-t border-border-faint">
        <h4 className="text-[11px] font-semibold text-neutral-400 ">
          Captured fields
        </h4>
        <p className="text-xs text-neutral-400 italic">No custom fields captured</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 pt-3 border-t border-border-faint">
      <h4 className="text-[11px] font-semibold text-neutral-400 ">
        Captured fields
      </h4>
      <div className="space-y-1.5">
        {entries.map(([key, value]) => {
          let displayVal = String(value);
          let isComplex = false;

          if (value === null) {
            displayVal = "null";
          } else if (typeof value === "object") {
            try {
              displayVal = JSON.stringify(value);
              isComplex = true;
            } catch {
              displayVal = String(value);
            }
          }

          const label = labels?.[key] ?? key;

          return (
            <div key={key} className="flex items-start text-xs">
              <span className="text-neutral-400 w-28 shrink-0" title={key}>
                {label}
              </span>
              {isComplex ? (
                <details className="min-w-0 flex-1">
                  <summary className="cursor-pointer text-heat-100 font-mono text-[11px]">
                    View JSON
                  </summary>
                  <pre className="mt-1 p-2 rounded bg-neutral-100 text-neutral-700 text-[10px] font-mono overflow-x-auto max-h-32">
                    {displayVal}
                  </pre>
                </details>
              ) : (
                <span className="text-accent-black font-medium min-w-0 flex-1 break-words">
                  {displayVal}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
