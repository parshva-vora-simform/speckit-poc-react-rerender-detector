import type { RenderEvent } from '../render-tracker';
import type { ComponentSummary, SeverityLevel } from './types';

/** Number of consecutive tail events required to trigger the instability hint. */
const HINT_WINDOW = 5;

function deriveSeverity(count: number): SeverityLevel {
  if (count <= 5) return 'low';
  if (count <= 20) return 'medium';
  return 'high';
}

/**
 * Pure selector: derives a ComponentSummary[] from the renderStore snapshot.
 *
 * Accepts the entire snapshot (Record<componentName, events>) and returns one
 * summary per component. Called inside useRenderSnapshot on every store update.
 *
 * All thresholds are v1 fixed values (see data-model.md, Entity 2):
 *   - Severity: low 1–5, medium 6–20, high >20
 *   - High-render warning: totalRenderCount > 20 (strict, not >=)
 *   - Reference-instability hint: last 5 consecutive renders all 'reference-change'
 */
export function computeSummaries(
  snapshot: Readonly<Record<string, readonly RenderEvent[]>>,
): ComponentSummary[] {
  return Object.entries(snapshot).map(([componentName, events]) => {
    const totalRenderCount = events.length;
    // events array is always non-empty (store only records actual renders)
    const lastEvent = events[totalRenderCount - 1]!;

    const tail = events.slice(-HINT_WINDOW);
    const hasReferenceInstabilityHint =
      tail.length >= HINT_WINDOW &&
      tail.every((e) => e.reason === 'reference-change');

    return {
      componentName,
      totalRenderCount,
      severityLevel: deriveSeverity(totalRenderCount),
      latestReason: lastEvent.reason,
      hasHighRenderWarning: totalRenderCount > 20,
      hasReferenceInstabilityHint,
    };
  });
}
