/**
 * Represents why a component re-rendered.
 *
 * Priority when multiple categories exist in the same render:
 *   props-change > reference-change > parent-render
 */
export type RenderReason =
  | 'props-change'       // ≥1 prop key's primitive value changed
  | 'reference-change'   // ≥1 prop reference changed; shallow contents identical
  | 'parent-render';     // no prop change; parent re-rendered or first render

/**
 * Output of the shallowDiff utility. Describes per-key changes between two
 * successive prop snapshots.
 */
export interface DiffResult {
  /** Overall classification for this diff. */
  readonly reason: RenderReason;
  /**
   * Keys that drove the reported reason.
   * - props-change      → value-changed keys
   * - reference-change  → reference-changed keys
   * - parent-render     → always empty
   */
  readonly changedKeys: readonly string[];
  /** All keys whose primitive / structural value changed. */
  readonly valueChangedKeys: readonly string[];
  /** All keys whose reference changed but shallow contents are equal. */
  readonly referenceChangedKeys: readonly string[];
}

/**
 * An immutable record capturing everything known about one committed render
 * of one tracked component.
 */
export interface RenderEvent {
  readonly componentName: string;
  /** Cumulative render count for this instance since mount, starting at 1. */
  readonly renderCount: number;
  /** ISO 8601 timestamp produced by new Date().toISOString(). */
  readonly timestamp: string;
  readonly reason: RenderReason;
  readonly changedKeys: readonly string[];
  /** Props from the previous render. null on the first render. */
  readonly prevProps: Readonly<Record<string, unknown>> | null;
  /** Shallow-copied props snapshot at the time of this render. */
  readonly currentProps: Readonly<Record<string, unknown>>;
}

/**
 * The value returned by useRenderTracker on every render.
 * Consumers destructure this for display or further analysis.
 */
export interface RenderTrackResult {
  readonly componentName: string;
  readonly renderCount: number;
  readonly reason: RenderReason;
  readonly changedKeys: readonly string[];
}
