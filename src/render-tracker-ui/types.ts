/**
 * View-model types for the render-tracker-ui devtool panel (feature 002).
 *
 * These types are derived from the engine's RenderEvent[] data and are used
 * exclusively by panel components. They are not persisted or transmitted.
 */
import type { RenderReason } from '../render-tracker';

// ---------------------------------------------------------------------------
// SeverityLevel
// ---------------------------------------------------------------------------

/**
 * Visual heat category derived from a component's total render count.
 *
 * Thresholds (v1, fixed):
 *   low    → 1–5 renders
 *   medium → 6–20 renders
 *   high   → >20 renders
 */
export type SeverityLevel = 'low' | 'medium' | 'high';

// ---------------------------------------------------------------------------
// PropValueDisplay
// ---------------------------------------------------------------------------

/**
 * A branded string representing a safely-formatted prop value for display.
 * Produced exclusively by formatPropValue(); never constructed directly.
 *
 * Primitives → their string form.
 * Non-primitives → bracketed type label: [object], [array], [function], [symbol].
 * null → 'null', undefined → 'undefined'.
 */
export type PropValueDisplay = string & { readonly __brand: 'PropValueDisplay' };

// ---------------------------------------------------------------------------
// PropDiffRow
// ---------------------------------------------------------------------------

/**
 * A single row in the prop diff table shown in the detail view.
 * Produced by computeEventRows().
 */
export interface PropDiffRow {
  readonly key: string;
  /** Formatted previous value. '—' when the previous value is absent (first render). */
  readonly prevDisplay: PropValueDisplay;
  readonly nextDisplay: PropValueDisplay;
  readonly changeType: 'value-change' | 'reference-change';
}

// ---------------------------------------------------------------------------
// RenderEventRow
// ---------------------------------------------------------------------------

/**
 * Display-ready representation of one RenderEvent from the engine,
 * enriched with a 1-based render number and formatted prop diff rows.
 */
export interface RenderEventRow {
  /** 1-based position of this event in the component's history. */
  readonly renderNumber: number;
  readonly reason: RenderReason;
  /** Empty when reason === 'parent-render'. */
  readonly propDiffRows: readonly PropDiffRow[];
}

// ---------------------------------------------------------------------------
// ComponentSummary
// ---------------------------------------------------------------------------

/**
 * Aggregated view-model for a single tracked component.
 * Derived from a component's full RenderEvent[] history via computeSummaries().
 * All fields are read-only; the object is immutable once created.
 */
export interface ComponentSummary {
  readonly componentName: string;
  readonly totalRenderCount: number;
  readonly severityLevel: SeverityLevel;
  readonly latestReason: RenderReason;
  /** true when totalRenderCount > 20 (strict threshold). */
  readonly hasHighRenderWarning: boolean;
  /** true when the last 5+ consecutive render events are all 'reference-change'. */
  readonly hasReferenceInstabilityHint: boolean;
}

// ---------------------------------------------------------------------------
// RenderTrackerPanelProps
// ---------------------------------------------------------------------------

/** Props accepted by the <RenderTrackerPanel /> root component. */
export interface RenderTrackerPanelProps {
  /** Additional CSS class applied to the panel root element. */
  readonly className?: string | undefined;
}
