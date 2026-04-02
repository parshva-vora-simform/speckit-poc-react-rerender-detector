import type { ReactElement } from 'react';
import { useEffect } from 'react';
import type { RenderEventRow } from './types';

interface ComponentDetailViewProps {
  readonly componentName: string;
  readonly eventRows: readonly RenderEventRow[];
  readonly onClose: () => void;
}

/**
 * Per-component render history detail pane.
 *
 * Displays ordered render events with reason labels and prop diff tables.
 * Closes on back-button click or Escape key (FR-012).
 * aria-live="polite" ensures screen readers announce new events (FR-005).
 */
export function ComponentDetailView({
  componentName,
  eventRows,
  onClose,
}: ComponentDetailViewProps): ReactElement {
  useEffect((): (() => void) => {
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return (): void => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <section className="rtu-detail">
      <button type="button" className="rtu-detail__back" onClick={onClose}>
        ← Back
      </button>
      <h3 className="rtu-detail__title">{componentName}</h3>
      <ol className="rtu-detail__events" aria-live="polite">
        {eventRows.map((row) => (
          <li key={row.renderNumber} className="rtu-detail__event">
            <span className="rtu-detail__render-num">#{row.renderNumber}</span>
            <span className="rtu-detail__reason">{row.reason}</span>
            {row.propDiffRows.length > 0 ? (
              <table className="rtu-detail__diff">
                <thead>
                  <tr>
                    <th scope="col">Prop</th>
                    <th scope="col">Previous</th>
                    <th scope="col">Current</th>
                  </tr>
                </thead>
                <tbody>
                  {row.propDiffRows.map((diff) => (
                    <tr key={diff.key} data-change-type={diff.changeType}>
                      <td>{diff.key}</td>
                      <td>{diff.prevDisplay}</td>
                      <td>{diff.nextDisplay}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="rtu-detail__no-changes">No prop changes detected.</p>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
