import type { ReactElement } from 'react';
import type { ComponentSummary } from './types';
import { InsightBadge } from './InsightBadge';

interface ComponentListViewProps {
  readonly summaries: readonly ComponentSummary[];
  readonly onSelect: (componentName: string) => void;
}

/**
 * Renders the overview list of all tracked components.
 *
 * Each row shows the component name, total render count, severity badge,
 * and any active insight indicators. Clicking a row fires onSelect.
 *
 * Accessibility: each row is a <button> so it is keyboard-focusable and
 * activatable via Enter/Space by default (Constitution Principle V).
 */
export function ComponentListView({
  summaries,
  onSelect,
}: ComponentListViewProps): ReactElement {
  if (summaries.length === 0) {
    return <p>No components tracked yet.</p>;
  }

  return (
    <ul aria-label="Tracked components">
      {summaries.map((summary) => (
        <li key={summary.componentName}>
          <button
            type="button"
            onClick={() => { onSelect(summary.componentName); }}
          >
            <span className="rtu-name">{summary.componentName}</span>
            <span className="rtu-count">{summary.totalRenderCount}</span>
            <span className="rtu-severity">{summary.severityLevel}</span>
            <InsightBadge
              hasHighRenderWarning={summary.hasHighRenderWarning}
              hasReferenceInstabilityHint={summary.hasReferenceInstabilityHint}
            />
          </button>
        </li>
      ))}
    </ul>
  );
}
