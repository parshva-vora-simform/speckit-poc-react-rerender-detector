import type { RenderEvent } from '../render-tracker';
import type { RenderEventRow, PropDiffRow, PropValueDisplay } from './types';
import { formatPropValue } from './formatPropValue';

/** Sentinel value used when a previous prop value is absent (first render or new key). */
const ABSENT_PREV: PropValueDisplay = '—' as PropValueDisplay;

/**
 * Pure selector: converts a RenderEvent[] into RenderEventRow[] for display.
 *
 * - renderNumber: 1-based position in the event array.
 * - propDiffRows: empty for 'parent-render' events; one row per changedKey
 *   for 'props-change' and 'reference-change' events.
 * - changeType: inferred from the event's reason —
 *     'reference-change' events → each changedKey is 'reference-change'
 *     'props-change' events    → each changedKey is 'value-change'
 */
export function computeEventRows(events: readonly RenderEvent[]): RenderEventRow[] {
  return events.map((event, index): RenderEventRow => {
    const renderNumber = index + 1;

    if (event.reason === 'parent-render') {
      return { renderNumber, reason: event.reason, propDiffRows: [] };
    }

    const changeType: PropDiffRow['changeType'] =
      event.reason === 'reference-change' ? 'reference-change' : 'value-change';

    const propDiffRows: PropDiffRow[] = event.changedKeys.map((key): PropDiffRow => {
      const prevValue =
        event.prevProps != null && key in event.prevProps
          ? event.prevProps[key]
          : undefined;
      const prevDisplay: PropValueDisplay =
        event.prevProps === null || !(key in event.prevProps)
          ? ABSENT_PREV
          : formatPropValue(prevValue);
      const nextDisplay = formatPropValue(event.currentProps[key]);

      return { key, prevDisplay, nextDisplay, changeType };
    });

    return { renderNumber, reason: event.reason, propDiffRows };
  });
}
