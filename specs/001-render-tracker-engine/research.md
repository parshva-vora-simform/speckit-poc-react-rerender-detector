# Research: Lightweight UI Re-render Detection Engine

**Phase**: 0 — Outline & Research  
**Date**: 2026-04-02  
**Plan**: [plan.md](plan.md)

All NEEDS CLARIFICATION items from the spec have been resolved below. Four
technical decision areas were identified and researched: global store
implementation, previous-props tracking pattern, shallow diff algorithm, and
headless testing strategy.

---

## Decision 1: Global Render Store Implementation

**Decision**: Module-level singleton class using a `Map<string, RenderEvent[]>`
internally, exposing `subscribe` / `getSnapshot` methods compatible with React's
`useSyncExternalStore`.

**Rationale**:

The store must satisfy three competing constraints:

1. **No render-cascade**: A React Context value update re-renders all consumers
   in the subtree. If `useRenderTracker` writes to a Context on every render,
   every tracked component will trigger re-renders in every other Context
   subscriber — a feedback loop that is unacceptable for a debugging tool.

2. **Headless testability**: The store must work in a pure Node.js environment
   with no `React.createContext` calls or Provider wrappers required.

3. **Optional reactive reading**: A consumer that wants to display live data in a
   panel should be able to subscribe reactively without polling.

A module-level singleton satisfies all three: it is always available without a
Provider, triggers no React re-renders when written to, and can expose a
`subscribe` / `getSnapshot` pair for `useSyncExternalStore` to power optional
reactive display components.

**Alternatives considered**:

| Alternative | Rejected because |
|-------------|-----------------|
| React Context + `useReducer` | Context value update cascades re-renders to all subscribers. Since `useRenderTracker` fires on every component render, this creates a re-render storm. |
| Zustand store | Adds a new runtime dependency not currently in the project. Zustand is not on the constitution's forbidden list, but it is unnecessary: the same pattern (module singleton + subscribe) is trivially implementable without it. Avoided per YAGNI. |
| `useRef` local-only log (no global store) | Does not satisfy FR-008/FR-009 (global accessibility). Renders the store unqueryable across components. |
| `window.__renderStore` global | Breaks Node.js testability (FR-010). Creates a mutable global that complicates parallel test isolation. |

---

## Decision 2: Previous-Props Tracking Pattern

**Decision**: Use `useRef` to hold the previous render's props snapshot; update
the ref *after* computing the diff but *within* the render function body. Apply
the store append as a `useLayoutEffect` with no dependency array.

**Rationale**:

`useRef` is the canonical React mechanism for persisting a mutable value across
renders without triggering a re-render. The ref update is a deliberate, controlled
mutation inside the hook implementation — not a side effect on external state.

The diff computation (synchronous, `useRef` read) and the ref update (synchronous,
`useRef` write) happen during the render pass. The store append is deferred to
`useLayoutEffect` (runs synchronously after DOM mutations, before paint) to keep
the render body side-effect-free with respect to external state.

**React Strict Mode note**: In development, React invokes the render function
twice for the same committed render. The `useRef` mutation happens twice,
incrementing `renderCountRef.current` once per invocation. Effects (`useLayoutEffect`)
run only once per committed render. This means the render count may diverge from
the effect-based store event count in Strict Mode. Per the spec assumption,
"the engine reports all invocations transparently." Strict Mode double-invoke
counts are a documented environment characteristic, not a bug.

**Alternatives considered**:

| Alternative | Rejected because |
|-------------|-----------------|
| `useState` for previous props | Updating state in the render body causes an additional render cycle. Unusable. |
| `useEffect` for diff | `useEffect` runs asynchronously after paint; the diff would be stale relative to the triggering render. The hook must return current diff data synchronously. |
| Module-level `Map<string, unknown>` keyed by component name | Works for a single instance per name but breaks when the same component name is used more than once (edge case in spec). `useRef` is instance-scoped. |

---

## Decision 3: Shallow Diff Algorithm

**Decision**: Two-pass algorithm — (1) reference equality check (`===`), (2) if
references differ, one-level structural equality check on enumerable own-keys
with primitive leaf comparison (`===`). Classify each changed key independently,
then derive the overall reason from the union of changed-key categories.

**Overall reason priority**: `props-change` > `reference-change` > `parent-render`.
If *any* key is a value change, the render is reported as `props-change` regardless
of how many keys are reference-change-only. This reflects the developer use-case:
if a value changed, that is the dominant signal.

**Rationale**:

The spec defines three semantic categories that require distinguishing two levels
of equality:

- **Strict equality** (`===`): catches primitives and same-object references
  (no change at all).
- **Shallow structural equality**: for non-primitive values where `!==` but the
  one-level-deep key/value pairs are all `===`. This is the "reference-change"
  case (e.g., a new `{}` or `[]` created each render with the same contents).

Going deeper than one level would make the diff quadratically expensive for
large nested objects and would conflict with the spec's definition: "one-level-deep
(shallow) comparison of their enumerable own-keys and values."

Function props (event handlers) are non-primitive and rarely have the same object
reference between renders (inline arrow functions create a new function reference
each render). Their structural equality check (`Object.keys` of a function) yields
zero keys, so two distinct function references with zero keys are shallowly equal —
classified as `reference-change`. This is the correct signal: "a new function
reference replaced an old one, but no semantic data changed."

**Edge cases resolved**:

| Edge case | Resolution |
|-----------|-----------|
| Key present in `prev` but absent in `next` (or vice-versa) | Treated as value change (`props-change`) for that key. One snapshot has `undefined`; the other has a value. `undefined !== value` → value change. |
| Both values are `null` | `null === null` → no change. Correct. |
| `prev` is `null` (first render) | Early-return `{ reason: 'parent-render', changedKeys: [] }` — no prior snapshot to diff against. |
| Function props | Non-primitive; structural equality check produces `reference-change` if the function body is "the same function type" (zero own-keys). Accurately reflects the situation. |
| Props with `Symbol` keys | Out of scope for v1 per spec assumption. `Object.keys` ignores Symbol keys. No change needed. |

**Alternatives considered**:

| Alternative | Rejected because |
|-------------|-----------------|
| Deep recursive equality | Exponential cost for large prop trees; out of spec scope ("shallow"). |
| JSON serialisation comparison | Fails for functions, `undefined`, circular refs; silently wrong. |
| Third-party `fast-deep-equal` or `dequal` | Unnecessary new dependency. Spec-bounded shallow diff is 30 lines of plain TS. |

---

## Decision 4: Headless Testing Strategy (FR-010, SC-004)

**Decision**: Vitest as the test runner; `@testing-library/react` for hook tests
via `renderHook`; pure Node.js unit tests (no `jsdom`) for `shallowDiff` and
`renderStore`.

**Rationale**:

Vitest runs in Node.js natively. For the `shallowDiff` utility and `renderStore`
singleton (no React), no DOM environment is needed at all — tests import and call
functions directly.

For `useRenderTracker`, which calls `useRef` and `useLayoutEffect`, a minimal React
environment is required. `@testing-library/react`'s `renderHook` provides exactly
this: it renders a hook in a minimal test component using React's own test renderer
(or jsdom). The `environment` for hook tests is set to `jsdom` in Vitest config;
the utility tests use the default `node` environment:

```ts
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'jsdom',          // default for React hook tests
    environmentMatchGlobs: [
      ['**/__tests__/shallowDiff.test.ts', 'node'],
      ['**/__tests__/store.test.ts', 'node'],
    ],
  },
})
```

This satisfies FR-010 (core logic exercisable in Node.js) while permitting the
hook integration test to use the minimal jsdom environment that React requires for
`useLayoutEffect`.

**Alternatives considered**:

| Alternative | Rejected because |
|-------------|-----------------|
| Bun test runner | Not in the current project stack; Vitest is already the chosen test framework (constitution). |
| `react-test-renderer` directly | Lower-level than `renderHook`; requires more boilerplate; `@testing-library/react` is the project's chosen testing library. |
| Mocking `useLayoutEffect` to skip it | Would reduce test fidelity and would not prove the store append actually runs. |

---

## Resolved Clarifications

All spec assumptions that deferred a decision to `/speckit.plan` are now resolved:

| Deferred Item | Resolution |
|---------------|-----------|
| Store implementation (Context or Zustand) | Module-level singleton (Decision 1) |
| Testing strategy for headless execution | Vitest + node environment for pure utilities; jsdom for hook tests (Decision 4) |
