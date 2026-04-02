# Data Model: Render Tracker DevTool Panel

**Feature**: 002-render-tracker-ui
**Date**: 2026-04-02
**Status**: Final

This file describes the view-model entities introduced by the panel UI. None of
these entities are persisted or communicated across a network — they are derived
entirely from the in-memory `renderStore` at render time and discarded when the
panel unmounts.

Engine types from feature 001 (`RenderReason`, `DiffResult`, `RenderEvent`) are
consumed but not redefined here. See `src/render-tracker/types.ts`.

---

## Entity 1: `SeverityLevel`

**Kind**: Literal union (type alias)

**Description**: Communicates how aggressively a component is re-rendering,
derived from its total render count. Drives the visual badge colour in the
component list.

**Definition**:

```typescript
type SeverityLevel = 'low' | 'medium' | 'high';
```

**Derivation rules** (from FR-003):

| Total render count | Severity |
|--------------------|----------|
| 1–5 | `'low'` |
| 6–20 | `'medium'` |
| >20 | `'high'` |

**Invariants**:
- Every `ComponentSummary` MUST have exactly one `SeverityLevel`.
- A component that has never rendered (count = 0) is never added to the store, so
  count = 0 is not a valid input.

---

## Entity 2: `ComponentSummary`

**Kind**: Read-only value object

**Description**: A derived view-model aggregating all information needed to render
one row of the component overview list. Computed from a component's full
`RenderEvent[]` history.

**Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `componentName` | `string` | Component's registered name (from engine) |
| `totalRenderCount` | `number` | Total accumulated render events |
| `severityLevel` | `SeverityLevel` | Heat badge category (see Entity 1) |
| `latestReason` | `RenderReason` | Reason from the most recent render event |
| `hasHighRenderWarning` | `boolean` | `true` when `totalRenderCount > 20` |
| `hasReferenceInstabilityHint` | `boolean` | `true` when 5+ consecutive most-recent renders are all `reference-change` |

**Derivation rules**:
- `severityLevel`: derived by the threshold table in Entity 1.
- `hasHighRenderWarning`: `totalRenderCount > 20` (strict; 20 renders does **not** trigger the warning — per AC3 in US3).
- `hasReferenceInstabilityHint`: take the last `min(5, events.length)` events from the history; if all have `reason === 'reference-change'`, the hint is `true`. If the component has fewer than 5 events, the hint MUST NOT be shown (insufficient signal). The threshold is exactly 5 consecutive events.

**Invariants**:
- `totalRenderCount >= 1` always (the store only records components that have rendered at least once).
- `latestReason` is the `reason` field of the last element in the events array.
- The object is immutable; the selector produces a new reference whenever the underlying `RenderEvent[]` for that component changes.

---

## Entity 3: `PropValueDisplay`

**Kind**: Branded string type alias

**Description**: A human-readable, safely-truncated string representation of a
single prop value, produced by `formatPropValue`. Used in prop diff rows to show
prev/next values.

**Definition**:

```typescript
type PropValueDisplay = string & { readonly __brand: 'PropValueDisplay' };
```

**Formatting rules** (from FR-006 and research Decision 3):

| Input type | Formatted output |
|------------|-----------------|
| `string` (non-empty) | verbatim value |
| `string` (empty) | `'""'` |
| `number` / `boolean` / `bigint` | `String(value)` |
| `undefined` | `'undefined'` |
| `null` | `'null'` |
| `Array` | `'[array]'` |
| `function` | `'[function]'` |
| plain object | `'[object]'` |
| `symbol` | `'[symbol]'` |

**Invariants**:
- `formatPropValue` is a pure function — same input always yields the same output.
- Output is never an empty string; every type has a non-empty representation.
- Output MUST fit in a single table cell without wrapping beyond ~40 characters.

---

## Entity 4: `RenderEventRow`

**Kind**: Read-only value object

**Description**: A display-ready representation of one `RenderEvent` in the
detail view. Derives formatted strings from the raw event so the component only
needs to render strings, never manipulate values.

**Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `renderNumber` | `number` | 1-based index of this event in the component's history |
| `reason` | `RenderReason` | Reason label from the engine |
| `propDiffRows` | `readonly PropDiffRow[]` | Changed prop pairs; empty for `parent-render` events |

**Sub-entity `PropDiffRow`**:

| Field | Type | Description |
|-------|------|-------------|
| `key` | `string` | Prop key that changed |
| `prevDisplay` | `PropValueDisplay` | Formatted previous value |
| `nextDisplay` | `PropValueDisplay` | Formatted current value |
| `changeType` | `'value-change' \| 'reference-change'` | Classification from the engine's `DiffResult` |

**Invariants**:
- `renderNumber` is assigned at derivation time as the 1-based position in the
  component's event array.
- `propDiffRows` is `[]` when `reason === 'parent-render'` (FR-005).
- `prevDisplay` uses `'—'` (em dash) when `prevProps` is `null` or `undefined`
  for a given key (first-render edge case; FR-005 AC4).

---

## Entity 5: `PanelState`

**Kind**: Local UI state (not persisted)

**Description**: The panel's internal navigation state. Tracks which component
is currently selected in the detail view (if any).

**Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `selectedComponentName` | `string \| null` | Name of the currently selected component; `null` = overview list visible |

**State transitions**:

```text
null (overview)
  │── user selects row ──▶ "ComponentName" (detail)
  │                              │
  │◀── user presses Escape ──────┘
  │◀── user clicks back  ────────┘
```

**Invariants**:
- `selectedComponentName` MUST be a name present in the current store snapshot,
  or `null`. If the selected component is somehow absent from a subsequent
  snapshot (unlikely in v1 — clearance is not part of the public API), the panel
  MUST fall back to `null`.

---

## Entity Relationship Summary

```text
renderStore (feature 001)
    └─ getSnapshot() ──▶ Record<string, RenderEvent[]>
                              │
                    computeSummaries()
                              │
                              ▼
                  ComponentSummary[]            ← drives ComponentListView
                              │
                  (on row select)
                              │
                    computeEventRows()
                              │
                              ▼
                  RenderEventRow[]              ← drives ComponentDetailView
                    (each row has)
                              │
                    PropDiffRow[]
                    (each cell uses)
                              │
                    formatPropValue()
                              │
                              ▼
                  PropValueDisplay (string)     ← rendered in table cells
```
