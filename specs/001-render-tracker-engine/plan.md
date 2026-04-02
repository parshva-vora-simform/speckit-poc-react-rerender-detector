# Implementation Plan: Lightweight UI Re-render Detection Engine

**Branch**: `001-render-tracker-engine` | **Date**: 2026-04-02 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `/specs/001-render-tracker-engine/spec.md`

## Summary

Build a UI-agnostic, browser-free-core re-render detection engine as a set of
TypeScript utilities living under `src/render-tracker/`. The engine's primary
surface is a custom React hook, `useRenderTracker`, which tracks render count,
diffs previous against current props via a standalone `shallowDiff` utility, and
classifies each render as `props-change`, `reference-change`, or `parent-render`.
All events are persisted in a module-level singleton store that is compatible with
`useSyncExternalStore` for reactive consumers. The entire core—diff, store, and
hook logic—runs in Node.js without browser globals, enabling headless Vitest
testing with `@testing-library/react`'s `renderHook`.

## Technical Context

**Language/Version**: TypeScript ~5.9.x (`strict: true`, `noUncheckedIndexedAccess: true`)  
**Primary Dependencies**: React ^19.2.x, `@testing-library/react` ^16.x (new dev dep), Vitest ^3.x (new dev dep)  
**Storage**: Module-level singleton `Map<string, RenderEvent[]>` — in-memory, session-scoped, no persistence  
**Testing**: Vitest + `@testing-library/react` (`renderHook`); pure unit tests for `shallowDiff` and store  
**Target Platform**: Browser (dev mode); pure Node.js for all unit tests  
**Project Type**: Developer tooling library (hooks + pure utilities)  
**Performance Goals**: <1 ms overhead per render for a component with ≤50 top-level props  
**Constraints**: Zero browser globals in core logic; `useRenderTracker` callable with one line per component; engine produces no rendered HTML of its own  
**Scale/Scope**: Dev-only; session lifetime; up to 1,000+ render events without data loss

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| # | Principle | Status | Notes |
|---|-----------|--------|-------|
| I | Component-First Architecture (React 19) | ✅ PASS | Engine is a custom hook + pure utility modules. No class logic, no rendered components. Single responsibility per module. `useRenderTracker` is a pure side-effect hook; render body is pure. |
| II | TypeScript Strict Mode | ✅ PASS | All engine files are `.ts` only (no JSX in engine). `strict: true` applies. No `any`. All exported symbols carry explicit return-type annotations. `noUncheckedIndexedAccess` handled via `?? []` guards in store access. |
| III | Test-First Development | ✅ PASS — REQUIRED | Vitest + `@testing-library/react` must be installed *before* implementation. Test files are written and reviewed red before implementation begins. Covers: `shallowDiff` (pure unit), `renderStore` (pure unit), `useRenderTracker` (hook integration via `renderHook`). ≥80% line coverage enforced. |
| IV | Performance & Bundle Discipline | ⚠️ VARIANCE JUSTIFIED | The engine is a developer debugging utility with no UI routes. `React.lazy` + `Suspense` route-splitting is not applicable — there is no render path. Production exclusion is achieved by wrapping the `useRenderTracker` call in an `import.meta.env.DEV` guard at the consumer level (documented in quickstart.md). Constitution's bundle-budget rule still applies: engine chunk MUST be <500 kB (trivially satisfied by a ~3 kB utility). |
| V | Accessibility & Semantic HTML | N/A — JUSTIFIED | The engine renders no HTML elements. There are no interactive or visual elements to audit. Any consumer-built display panel is responsible for its own a11y compliance per this constitution. |

**GATE RESULT**: ✅ All non-applicable variances are justified. Proceed to Phase 0.

**Post-Phase 1 re-check**: No design decisions introduced to Phase 1 invalidate the above. Variance for Principle IV stands; see Complexity Tracking below.

## Project Structure

### Documentation (this feature)

```text
specs/001-render-tracker-engine/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/
│   └── public-api.md    ← Phase 1 output
└── tasks.md             ← Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
src/
└── render-tracker/
    ├── types.ts               # RenderReason, RenderEvent, RenderLog, DiffResult, RenderTrackResult
    ├── shallowDiff.ts         # Pure shallow diff utility + isShallowEqual helper
    ├── store.ts               # Module-level RenderStore singleton + subscribe/getSnapshot
    ├── useRenderTracker.ts    # Custom hook — primary consumer entry point
    └── index.ts               # Public barrel export

    └── __tests__/
        ├── shallowDiff.test.ts
        ├── store.test.ts
        └── useRenderTracker.test.ts
```

**Structure Decision**: Single-project layout under `src/render-tracker/`. The engine
is a self-contained feature module, not a separate package. No `backend/` or
`frontend/` split — the project is a pure frontend SPA and the engine lives
entirely in the client source. Collocated `__tests__/` directory follows the
Vitest convention for this project.

## Complexity Tracking

| Variance | Why Needed | Simpler Alternative Rejected Because |
|---------|------------|--------------------------------------|
| Principle IV variance (no `React.lazy`) | Engine is a utility hook with no render path; route-splitting has no meaning for a module that exports hooks and functions, not components or pages. | Wrapping the entire engine in a lazy-loadable component boundary would add unnecessary indirection and provide zero performance benefit — the engine code is ~3 kB and is loaded at app startup in dev mode only. |
| Module-level singleton store (vs Context store) | A Context-based store would cause every tracked component to subscribe to the store and trigger re-renders whenever *any* other tracked component renders — creating infinite render cascades for a debugging tool. | Context with `useSyncExternalStore` subscribed at the leaf level still requires a Provider in the tree. The module singleton works headlessly in tests and avoids any tree-injection requirement. `useSyncExternalStore` is used only for optional reactive *reading* consumers. |
| `react-hooks/refs` rule disabled in `useRenderTracker.ts` | `eslint-plugin-react-hooks@7` disallows reading or writing `ref.current` during the render body. This hook intentionally reads `prevPropsRef` and mutates `renderCountRef` during render to compute the diff and render count synchronously — deferring to `useLayoutEffect` would delay the result by one render (stale data). The disable is file-scoped, documented with an inline comment, and applies only to the dev-tooling hook, not any production component. | Moving diff computation to `useLayoutEffect` would cause the hook to always return the previous render's result rather than the current one — defeating its core contract (FR-001, FR-002).
