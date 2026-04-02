import type { ReactElement } from 'react';

interface InsightBadgeProps {
  readonly hasHighRenderWarning: boolean;
  readonly hasReferenceInstabilityHint: boolean;
}

/**
 * Renders inline insight indicators for a component row.
 *
 * - High render count warning: shown when totalRenderCount > 20.
 * - Reference instability hint: shown when last 5 consecutive renders are
 *   all 'reference-change', suggesting unstable object/function references.
 *
 * Each indicator provides an accessible label and a title tooltip with
 * actionable guidance (Constitution Principle V; FR-010).
 *
 * Returns null when both flags are false (nothing to display).
 */
export function InsightBadge({
  hasHighRenderWarning,
  hasReferenceInstabilityHint,
}: InsightBadgeProps): ReactElement | null {
  if (!hasHighRenderWarning && !hasReferenceInstabilityHint) {
    return null;
  }

  return (
    <>
      {hasHighRenderWarning && (
        <span
          className="rtu-insight rtu-insight--warning"
          title="This component has a high render count. Consider memoising expensive child subtrees or lifting state."
          aria-label="high render count warning"
          role="img"
        >
          ⚠ high render count
        </span>
      )}
      {hasReferenceInstabilityHint && (
        <span
          className="rtu-insight rtu-insight--hint"
          title="Last renders were reference-change. Consider wrapping objects or callbacks in useMemo / useCallback to stabilise references."
          aria-label="consider useMemo or useCallback to stabilise references"
          role="img"
        >
          💡 useMemo/useCallback
        </span>
      )}
    </>
  );
}
