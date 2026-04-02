# Data Model: Lightweight UI Re-render Detection Engine

**Phase**: 1 — Design & Contracts  
**Date**: 2026-04-02  
**Plan**: [plan.md](plan.md) | **Research**: [research.md](research.md)

---

## Entities

### `RenderReason`

A discriminated string union representing the sole cause of a single render event.
Exactly one value is assigned per event.

```
'props-change'      — at least one prop key's primitive value changed
'reference-change'  — at least one prop key has a new object/function reference
                       whose shallow contents are identical to the previous reference
'parent-render'     — no prop change detected; component re-rendered because its
                       parent did, or because it is the first render (no prev snapshot)
```

**Priority rule**: If both value-changed keys and reference-only-changed keys
exist in the same render, `props-change` takes precedence. `parent-render` is only
assigned when zero keys changed by any measure.

---

### `DiffResult`

The output of the `shallowDiff` utility. Describes what changed between two
successive prop snapshots.

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `reason` | `RenderReason` | No | Overall classification for this diff |
| `changedKeys` | `string[]` | No | Keys that contributed to the reason. Empty on `parent-render`. For `props-change`, contains only value-changed keys. For `reference-change`, contains reference-changed keys. |
| `valueChangedKeys` | `string[]` | No | All keys whose primitive/deep value changed (`props-change` contributors) |
| `referenceChangedKeys` | `string[]` | No | All keys whose reference changed but shallow-equal value is the same |

**Invariants**:
- `changedKeys` is always a subset of `valueChangedKeys ∪ referenceChangedKeys`
- When `reason === 'props-change'`, `changedKeys === valueChangedKeys`
- When `reason === 'reference-change'`, `changedKeys === referenceChangedKeys`
- When `reason === 'parent-render'`, all three arrays are empty

---

### `RenderEvent`

An immutable record capturing everything known about one committed render of one
tracked component. Written to the store by `useRenderTracker` after each render.

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `componentName` | `string` | No | The name passed to `useRenderTracker` |
| `renderCount` | `number` | No | Cumulative render count for this instance since mount, starting at 1 |
| `timestamp` | `string` | No | ISO 8601 timestamp from `new Date().toISOString()` at the point of the render |
| `reason` | `RenderReason` | No | Classification from `shallowDiff` |
| `changedKeys` | `string[]` | No | Keys that drove the reason (may be empty) |
| `prevProps` | `Readonly<Record<string, unknown>> \| null` | Yes (`null` on first render) | Snapshot of props from the previous render |
| `currentProps` | `Readonly<Record<string, unknown>>` | No | Snapshot of props at the time of this render |

**Invariants**:
- `renderCount >= 1`
- When `renderCount === 1`, `prevProps` is always `null` and `reason` is always `parent-render`
- `changedKeys` is always consistent with `reason` per the `DiffResult` invariants above
- `currentProps` is a shallow-frozen copy (not the live prop reference) to prevent mutation aliasing

---

### `RenderLog`

The ordered, append-only collection of all `RenderEvent` records for a single
tracked component instance. Keyed by `componentName` in the `GlobalRenderStore`.

```
RenderLog = RenderEvent[]
```

**Invariants**:
- Events are ordered by insertion time (first render first, most recent last)
- `RenderLog[i].renderCount === i + 1` for a single component instance
- Never mutable after an event is appended; new events are appended, existing
  events are never modified

---

### `GlobalRenderStore`

The module-level singleton that holds all `RenderLog` entries for the session.
Implemented as a class; one instance is exported as `renderStore`.

**Internal state**:

| Field | Type | Description |
|-------|------|-------------|
| `_logs` | `Map<string, RenderEvent[]>` | Component name → ordered event list |
| `_listeners` | `Set<() => void>` | Subscribers for `useSyncExternalStore` |
| `_snapshot` | `Readonly<Map<string, RenderEvent[]>>` | Frozen snapshot reference, invalidated on each append |

**Public methods**:

| Method | Signature | Description |
|--------|-----------|-------------|
| `append` | `(componentName: string, event: RenderEvent) => void` | Adds event to the named component's log; notifies listeners |
| `getLog` | `(componentName: string) => RenderEvent[]` | Returns the full log for a component; returns `[]` if not yet tracked |
| `getAllLogs` | `() => ReadonlyMap<string, RenderEvent[]>` | Returns a read-only view of all logs; suitable for display panels |
| `subscribe` | `(listener: () => void) => () => void` | Registers a change listener; returns an unsubscribe function |
| `getSnapshot` | `() => Readonly<Map<string, RenderEvent[]>>` | Returns the current immutable snapshot; identity changes only on `append` |
| `clear` | `() => void` | Removes all logs and notifies listeners. Intended for test teardown only. |

**React integration note**: `subscribe` + `getSnapshot` are designed for direct
use with `useSyncExternalStore(renderStore.subscribe, renderStore.getSnapshot)` in
any consumer component that wants reactive updates.

---

### `RenderTrackResult`

The value returned by the `useRenderTracker` hook on every render. This is the
primary type a component author interacts with.

| Field | Type | Description |
|-------|------|-------------|
| `componentName` | `string` | Echoes back the name passed to the hook |
| `renderCount` | `number` | Current cumulative render count for this instance |
| `reason` | `RenderReason` | Reason for the current render |
| `changedKeys` | `string[]` | Keys that drove the reason this render |

---

## State Transitions

### `RenderEvent` reason state machine (per component instance)

```
[First render]
      │
      ▼
 parent-render  ◄── (no prev snapshot)
      │
      ▼
 [Subsequent renders: diff against prevProps]
      │
      ├─── value changed in ≥1 key ──────► props-change
      │
      ├─── no value change, reference     
      │    changed in ≥1 key ────────────► reference-change
      │
      └─── no change at all ─────────────► parent-render
```

### `RenderLog` lifecycle

```
Mount of tracked component
      │
      ▼
  Log created (empty) in GlobalRenderStore
      │
      ▼
  RenderEvent appended on each render   ──► Log grows, never shrinks
      │
      ▼
  Unmount of tracked component
      │ (log is NOT cleared on unmount — retained for session history)
      ▼
  Log remains queryable until store.clear() is called
```

---

## Validation Rules

| Entity | Rule |
|--------|------|
| `RenderEvent.componentName` | Non-empty string. Empty string is accepted (warnings suppressible via console in dev) but logged as-is. |
| `RenderEvent.renderCount` | Positive integer ≥ 1. Monotonically increasing per instance. |
| `RenderEvent.timestamp` | Valid ISO 8601 string. Produced by `new Date().toISOString()`; no external validation required. |
| `DiffResult.changedKeys` | Each key must be an enumerable own-key of `prev` or `next`. |
| `currentProps` snapshot | Shallow-copied with `{ ...props }` at hook call time to prevent aliasing. |
