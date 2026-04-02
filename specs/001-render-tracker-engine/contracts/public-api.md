# Public API Contract: Lightweight UI Re-render Detection Engine

**Phase**: 1 — Design & Contracts  
**Date**: 2026-04-02  
**Module**: `src/render-tracker/index.ts`  
**Contract type**: TypeScript public API surface

This document defines the complete public interface that the `render-tracker`
module exposes to consumers. All symbols listed here are exported from the barrel
`src/render-tracker/index.ts`. Internal implementation symbols not listed here are
not part of the API contract and may change without notice.

---

## Types

### `RenderReason`

```ts
export type RenderReason =
  | 'props-change'       // ≥1 prop value changed
  | 'reference-change'   // ≥1 prop reference changed but shallow value is equal
  | 'parent-render';     // no prop change; parent re-rendered or first render
```

---

### `DiffResult`

```ts
export interface DiffResult {
  /** Overall classification for this diff. */
  readonly reason: RenderReason;
  /**
   * Keys that drove the reported reason.
   * - props-change   → value-changed keys
   * - reference-change → reference-changed keys
   * - parent-render  → always empty
   */
  readonly changedKeys: readonly string[];
  /** All keys whose primitive/structural value changed. */
  readonly valueChangedKeys: readonly string[];
  /** All keys whose reference changed but whose shallow contents are equal. */
  readonly referenceChangedKeys: readonly string[];
}
```

---

### `RenderEvent`

```ts
export interface RenderEvent {
  readonly componentName: string;
  readonly renderCount: number;
  readonly timestamp: string;           // ISO 8601
  readonly reason: RenderReason;
  readonly changedKeys: readonly string[];
  readonly prevProps: Readonly<Record<string, unknown>> | null;
  readonly currentProps: Readonly<Record<string, unknown>>;
}
```

---

### `RenderTrackResult`

```ts
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
```

---

## Functions

### `shallowDiff`

```ts
/**
 * Compares two prop snapshots and returns a classified diff result.
 *
 * @param prev - Props from the previous render. `null` on first render.
 * @param next - Props from the current render.
 * @returns A DiffResult classifying what changed.
 *
 * @remarks
 * - Comparison is one-level deep only (shallow). Nested objects are compared
 *   by reference at the top level, then by their own enumerable key/value pairs
 *   at the second level for the structural equality check.
 * - Function props are treated as non-primitives. Two distinct function
 *   references with zero own-keys are considered shallowly equal
 *   (reference-change, not props-change).
 * - Symbol keys are ignored (Object.keys behaviour).
 * - When `prev` is null, always returns reason: 'parent-render'.
 *
 * @pure This function has no side effects. Safe to call in the render body.
 */
export function shallowDiff(
  prev: Readonly<Record<string, unknown>> | null,
  next: Readonly<Record<string, unknown>>,
): DiffResult;
```

---

## Hook

### `useRenderTracker`

```ts
/**
 * Custom React hook that tracks re-renders for the calling component.
 *
 * Call this hook at the top level of a function component, passing the
 * component's name and its current props. The hook appends a RenderEvent to
 * the global store after each render and returns a RenderTrackResult
 * synchronously.
 *
 * @param componentName - A stable identifier for this component. Should match
 *   the component's display name. Duplicate names across distinct instances are
 *   allowed but will share the same log entry in the global store.
 * @param props - The component's current props as a plain object.
 *   Pass the full props object: `useRenderTracker('MyComp', props)`.
 * @returns RenderTrackResult for the current render.
 *
 * @remarks
 * - This hook uses useRef (for prev-props tracking and render count) and
 *   useLayoutEffect (for store append). It follows all React rules of hooks.
 * - The store append happens in useLayoutEffect (synchronous, after DOM
 *   mutations, before paint) to keep the render body side-effect free.
 * - In React Strict Mode (development), the render body executes twice per
 *   committed render. The render count reflects all invocations transparently.
 *
 * @example
 * ```tsx
 * function MyComponent(props: MyProps) {
 *   const { renderCount, reason } = useRenderTracker('MyComponent', props);
 *   // ... rest of component
 * }
 * ```
 *
 * @production
 * Wrap in an import.meta.env.DEV guard to tree-shake from production builds:
 * ```tsx
 * if (import.meta.env.DEV) {
 *   useRenderTracker('MyComponent', props); // eslint-disable-line react-hooks/rules-of-hooks
 * }
 * ```
 * Or use a no-op stub for production (see quickstart.md).
 */
export function useRenderTracker(
  componentName: string,
  props: Record<string, unknown>,
): RenderTrackResult;
```

---

## Store Singleton

### `renderStore`

```ts
/**
 * The global render event store. Module-level singleton.
 *
 * Consumers use this to query render history or to subscribe to changes.
 * Internal: useRenderTracker calls renderStore.append() via useLayoutEffect.
 */
export declare const renderStore: {
  /**
   * Appends a render event to the named component's log and notifies
   * all subscribers.
   */
  append(componentName: string, event: RenderEvent): void;

  /**
   * Returns all recorded render events for the given component.
   * Returns an empty array if the component has never been tracked.
   */
  getLog(componentName: string): RenderEvent[];

  /**
   * Returns a read-only view of all logs keyed by component name.
   */
  getAllLogs(): ReadonlyMap<string, RenderEvent[]>;

  /**
   * Registers a listener called whenever the store changes.
   * Returns an unsubscribe function.
   *
   * @remarks Compatible with useSyncExternalStore:
   * ```ts
   * const logs = useSyncExternalStore(
   *   renderStore.subscribe,
   *   renderStore.getSnapshot,
   * );
   * ```
   */
  subscribe(listener: () => void): () => void;

  /**
   * Returns the current immutable snapshot of all logs.
   * Object identity changes only when the store mutates.
   * Compatible with the second argument of useSyncExternalStore.
   */
  getSnapshot(): Readonly<Map<string, RenderEvent[]>>;

  /**
   * Removes all logs and notifies subscribers.
   * Intended for test teardown via afterEach(() => renderStore.clear()).
   */
  clear(): void;
};
```

---

## Barrel Export Summary

All of the following are re-exported by `src/render-tracker/index.ts`:

```ts
export type { RenderReason, DiffResult, RenderEvent, RenderTrackResult } from './types';
export { shallowDiff } from './shallowDiff';
export { renderStore } from './store';
export { useRenderTracker } from './useRenderTracker';
```

---

## Breaking-Change Policy

This API is internal to the project for v1. Any change to the signatures above
constitutes a breaking change and requires:

1. A new `spec.md` or a spec amendment documenting the change.
2. An update to all callers of the affected symbol.
3. A corresponding update to this file.
