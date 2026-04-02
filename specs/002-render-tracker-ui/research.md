# Research: Render Tracker DevTool Panel

**Feature**: 002-render-tracker-ui
**Date**: 2026-04-02
**Status**: Complete — 0 NEEDS CLARIFICATION items remaining

---

## Decision 1: Store Subscription Strategy

**Question**: How should the panel subscribe to `renderStore` to receive live updates without triggering additional renders in tracked components?

**Decision**: Use React 19's `useSyncExternalStore` with `renderStore.subscribe` and `renderStore.getSnapshot`.

**Rationale**:
- `renderStore` (feature 001) was explicitly designed with `subscribe` and `getSnapshot` methods for this purpose. The snapshot API returns a stable reference invalidated on each mutation, which is the contract `useSyncExternalStore` expects.
- `useSyncExternalStore` is the React-blessed primitive for subscribing to external mutable stores without tearing. It integrates with React's concurrent mode scheduler correctly — a plain `useEffect` + `useState` approach risks tearing and stale closure bugs.
- The call site is isolated in a single custom hook (`useRenderSnapshot`) so no panel component directly calls the store APIs.
- Tracked components (those calling `useRenderTracker`) are not affected by the panel subscription: the store's `notify` loop calls all listeners once, and React's batch-update machinery handles the panel's re-render without cascading into other components.

**Alternatives considered**:
- *`useEffect` + `setState`*: Rejected — risks tearing in concurrent mode and produces an extra render cycle per event.
- *React Context with a Provider*: Rejected — placing the store in Context would require wrapping the app tree, adding indirection and making the panel less portable. The module singleton is already the agreed pattern from 001's research.
- *Polling with `setInterval`*: Rejected — wasteful and introduces latency proportional to interval length.

---

## Decision 2: View-Model Derivation Placement

**Question**: Where should `ComponentSummary` be derived from the raw `RenderEvent[]` data — inside the component, inside the hook, or in a separate pure selector?

**Decision**: Derive `ComponentSummary[]` in a pure selector function `computeSummaries(snapshot)` called inside `useRenderSnapshot`, returning a memoised result when the snapshot reference is unchanged.

**Rationale**:
- Separating view-model computation from the component tree makes the selector independently testable in a `node` Vitest environment without mounting any React component.
- Memoising on snapshot reference identity is cheap (one `===` check) and prevents downstream component re-renders when the store emits a notification that does not change the summary for the currently-viewed component.
- The selector is a pure function: `(snapshot: Readonly<Record<string, RenderEvent[]>>) => ComponentSummary[]`. This makes it trivially serialisable and debuggable.
- Constitution principle I requires side effects to be isolated in hooks; placing computation in a pure function keeps the hook slim and the component pure.

**Alternatives considered**:
- *Derive inside the component render body*: Rejected — runs on every render, not memoised, harder to test.
- *Derive inside the hook with `useMemo`*: Valid, but `useMemo` is explicitly discouraged by the constitution unless profiling proves necessity. A plain referential equality check in the selector is simpler and correct.
- *Derive lazily on component selection*: Rejected — deferring derivation to selection breaks the live-update requirement for the overview list (US1 AS2).

---

## Decision 3: Prop Value Display Format

**Question**: How should prop values be formatted for display in the detail diff table? JSON.stringify, custom pretty-printing, or type labels?

**Decision**: Represent primitive values as their string form and all non-primitives (objects, arrays, functions, symbols) as a bracketed type label: `[object]`, `[array]`, `[function]`, `[symbol]`, `[null]`. Implement in a pure `formatPropValue(value: unknown): string` utility.

**Rationale**:
- `JSON.stringify` is unbounded in output size; a large nested object could produce hundreds of characters per cell, breaking layout and overwhelming the developer. The spec (FR-006) explicitly requires type labels for non-primitives.
- A type label is immediately actionable for debugging: "this prop is `[array]`" tells the developer whether to look for an unstable array literal at the call site, which is the actual root cause they are investigating.
- The formatter is a pure function, separately testable in `node` environment in under 10 lines.
- Type labels are short and fit naturally in a two-column table without truncation logic.

**Value format table**:

| Input type | Formatted output |
|------------|-----------------|
| `string` | the string value (quoted if empty: `""`) |
| `number`, `boolean`, `bigint` | `String(value)` |
| `undefined` | `"undefined"` |
| `null` | `"null"` |
| `Array` | `"[array]"` |
| `function` | `"[function]"` |
| plain object | `"[object]"` |
| symbol | `"[symbol]"` |

**Alternatives considered**:
- *JSON.stringify with truncation*: Rejected — truncation logic adds complexity and truncated JSON can mislead more than a type label.
- *React DevTools–style tree expansion*: Out of scope for v1 — would require a recursive tree component and significantly more test surface.

---

## Decision 4: Keyboard Navigation Pattern

**Question**: Should the component list use roving tabindex or a single-tabstop (focus management via arrow keys)?

**Decision**: Use a single-tabstop with roving `tabIndex` on the list (`tabIndex=0` on the focused row, `tabIndex=-1` on all others). Arrow keys move focus; Enter/Space select; Escape closes the detail pane.

**Rationale**:
- The ARIA Authoring Practices Guide (APG) listbox / composite widget pattern uses roving tabindex precisely for lists of selectable items. This gives the panel native keyboard semantics at zero library cost.
- A single tabstop means the entire component list is traversed in one Tab press, keeping the panel unobtrusive when keyboard-navigating the host app.
- `react-focus-lock` or a focus-trap library is not needed: the detail pane is inline (not a modal), so focus simply moves into it when a row is selected. Escape returns focus to the last selected row in the overview list.
- The implementation is a handful of `onKeyDown` handlers on `<ul>` + `<li>` elements — no extra dependencies, directly testable with `@testing-library/user-event`.

**Alternatives considered**:
- *Each row is its own tabstop*: Rejected — for long component lists (20+ items) this creates excessive tab stops, degrading keyboard UX for the host app.
- *Keyboard library (e.g., `react-aria`)*: Rejected — adds a runtime dependency exceeding the 10 kB budget gate (Constitution IV). The pattern is simple enough to implement directly.

---

## Decision 5: Dev-Only Guard Strategy

**Question**: How should the panel be excluded from production builds? `process.env.NODE_ENV`, `import.meta.env.DEV`, or a separate entry point?

**Decision**: The `src/render-tracker-ui/index.ts` barrel exports the panel only under `import.meta.env.DEV`. The barrel is the recommended import path; calling code uses:

```tsx
{import.meta.env.DEV && <RenderTrackerPanel />}
```

or imports from the barrel which re-exports `null` components in production.

**Rationale**:
- `import.meta.env.DEV` is the Vite-native boolean — Vite replaces it with `false` at build time (`mode=production`), allowing tree-shaking and dead-code elimination of the entire `render-tracker-ui/` subtree.
- This matches the pattern used by `useDevRenderTracker` in feature 001 (the `import.meta.env.DEV` guard makes production tree-shaking reliable and predictable).
- SC-005 requires verification via build output inspection — the production bundle should contain no strings or symbols from `render-tracker-ui/`.

**Alternatives considered**:
- *Separate entry point with `?dev` query suffix*: Rejected — requires host app build config changes.
- *`process.env.NODE_ENV === 'development'`*: Rejected — not Vite-native; Vite does not replace this string reliably in all configurations. `import.meta.env.DEV` is the canonical Vite pattern.
