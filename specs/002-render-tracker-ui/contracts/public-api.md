# Public API Contract: Render Tracker DevTool Panel

**Feature**: 002-render-tracker-ui
**Date**: 2026-04-02
**Status**: Final

This file defines the TypeScript interface contract for the panel component and
its supporting view-model types. These are the stable surface that consuming code
(e.g., `App.tsx`, an integration test harness) depends on.

> **Scope**: This contract covers only the public exports of
> `src/render-tracker-ui/index.ts`. Internal module boundaries (hooks, selectors,
> formatters) are implementation details and are not part of this contract.

---

## Types

### `SeverityLevel`

```typescript
/**
 * Visual heat category derived from a component's total render count.
 *
 * Thresholds (v1, fixed):
 *   low    → 1–5 renders
 *   medium → 6–20 renders
 *   high   → >20 renders
 */
type SeverityLevel = 'low' | 'medium' | 'high';
```

---

### `ComponentSummary`

```typescript
/**
 * Aggregated view-model for a single tracked component.
 * Derived from a component's full RenderEvent[] history via computeSummaries().
 * All fields are read-only; this object is immutable once created.
 */
interface ComponentSummary {
  readonly componentName: string;
  readonly totalRenderCount: number;
  readonly severityLevel: SeverityLevel;
  readonly latestReason: RenderReason;        // imported from render-tracker engine
  readonly hasHighRenderWarning: boolean;     // true when totalRenderCount > 20
  readonly hasReferenceInstabilityHint: boolean; // true when last 5+ consecutive renders are reference-change
}
```

---

### `PropValueDisplay`

```typescript
/**
 * A branded string representing a safely-formatted prop value for display.
 * Produced exclusively by formatPropValue().
 *
 * Primitives are represented as their string form.
 * Non-primitives are represented as bracketed type labels: [object], [array], [function], [symbol].
 * null → 'null', undefined → 'undefined'.
 */
type PropValueDisplay = string & { readonly __brand: 'PropValueDisplay' };
```

---

### `PropDiffRow`

```typescript
/**
 * A single row in the prop diff table shown in the detail view.
 */
interface PropDiffRow {
  readonly key: string;
  readonly prevDisplay: PropValueDisplay;    // '—' when prev value is absent (first render)
  readonly nextDisplay: PropValueDisplay;
  readonly changeType: 'value-change' | 'reference-change';
}
```

---

### `RenderEventRow`

```typescript
/**
 * Display-ready representation of one RenderEvent from the engine,
 * enriched with a 1-based render number and formatted prop diff rows.
 */
interface RenderEventRow {
  readonly renderNumber: number;            // 1-based position in component's history
  readonly reason: RenderReason;            // imported from render-tracker engine
  readonly propDiffRows: readonly PropDiffRow[];  // empty when reason === 'parent-render'
}
```

---

### `RenderTrackerPanelProps`

```typescript
/**
 * Props accepted by the <RenderTrackerPanel /> component.
 *
 * The component takes no required props in v1 — it reads directly from the
 * renderStore singleton. Optional props allow host apps to layer in styling
 * or a portal target.
 */
interface RenderTrackerPanelProps {
  /** Additional CSS class to apply to the panel root element. */
  readonly className?: string | undefined;
}
```

---

## Component

### `RenderTrackerPanel`

```typescript
/**
 * Root devtool panel component.
 *
 * Subscribes to the global renderStore (feature 001) via useSyncExternalStore.
 * Renders a live overview list of tracked components with severity badges.
 * Selecting a component navigates to a detail view showing render history
 * and prop diffs.
 * Performance insights (high-render warning, reference-instability hint) are
 * shown inline on each component row.
 *
 * IMPORTANT: This component must only be rendered when import.meta.env.DEV is
 * true. It will throw in production builds if imported unconditionally.
 *
 * @example
 * ```tsx
 * // In App.tsx or a dev-only wrapper:
 * {import.meta.env.DEV && <RenderTrackerPanel />}
 * ```
 */
function RenderTrackerPanel(props: RenderTrackerPanelProps): React.ReactElement;
```

---

## Barrel Export (index.ts)

```typescript
// src/render-tracker-ui/index.ts

// Types
export type { SeverityLevel } from './types';
export type { ComponentSummary } from './types';
export type { PropValueDisplay } from './types';
export type { PropDiffRow } from './types';
export type { RenderEventRow } from './types';
export type { RenderTrackerPanelProps } from './types';

// Component (DEV-guarded at runtime)
export { RenderTrackerPanel } from './RenderTrackerPanel';
```

---

## Import / Re-use from Engine (feature 001)

The panel's internal code imports the following from `src/render-tracker`:

```typescript
import type { RenderReason, RenderEvent } from '../render-tracker';
import { renderStore } from '../render-tracker';
```

These are **not** re-exported from the panel barrel. Consumers who need engine
types should import them directly from `src/render-tracker`.

---

## Keyboard Interaction Contract

| Key | Context | Action |
|-----|---------|--------|
| `Tab` | Anywhere in panel | Moves focus to the component list (single tabstop entry) |
| `↑` / `↓` | Component list focused | Moves focus between component rows (roving tabindex) |
| `Enter` / `Space` | Component row focused | Selects component; navigates to detail view |
| `Escape` | Detail view open | Closes detail view; returns focus to previously selected row |
| `Tab` | Inside detail view | Natural DOM tab order through interactive elements |

---

## Accessibility Contract

- The overview list MUST be a `<ul>` with `role="listbox"` (or native `<ul>` with
  `aria-label`) and each row a `<li>` with `role="option"` and `aria-selected`.
- Severity badge MUST convey its meaning via `aria-label` or `<span
  class="sr-only">` text, not colour alone (WCAG 2.1 SC 1.4.1).
- The "high render count" warning and reference-instability hint MUST be announced
  by screen readers as part of the row label, not as separate decorative elements.
- The detail pane MUST have `aria-live="polite"` so newly-appended render events
  are announced without interrupting ongoing speech.
