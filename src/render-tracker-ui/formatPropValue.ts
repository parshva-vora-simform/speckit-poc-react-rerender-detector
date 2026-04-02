import type { PropValueDisplay } from './types';

/**
 * Formats an unknown prop value into a safely-bounded display string.
 *
 * Non-primitive values are represented as bracketed type labels to prevent
 * unbounded output that could overflow the diff table cell.
 *
 * Returns a PropValueDisplay branded string — the cast is safe because the
 * function exhaustively handles every JS value type and always returns a
 * non-empty string.
 */
export function formatPropValue(value: unknown): PropValueDisplay {
  if (value === null) return 'null' as PropValueDisplay;
  if (value === undefined) return 'undefined' as PropValueDisplay;
  if (typeof value === 'string') {
    // Safe cast: result is always a non-empty string.
    return (value === '' ? '""' : value) as PropValueDisplay;
  }
  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    // Safe cast: String() on these types always produces a non-empty string.
    return String(value) as PropValueDisplay;
  }
  if (typeof value === 'symbol') return '[symbol]' as PropValueDisplay;
  if (typeof value === 'function') return '[function]' as PropValueDisplay;
  if (Array.isArray(value)) return '[array]' as PropValueDisplay;
  // Remaining case: plain object (typeof === 'object', non-null, non-array).
  return '[object]' as PropValueDisplay;
}
