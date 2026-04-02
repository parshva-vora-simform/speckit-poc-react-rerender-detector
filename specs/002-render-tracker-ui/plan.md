# Implementation Plan: Render Tracker DevTool Panel

**Branch**: `002-render-tracker-ui` | **Date**: 2026-04-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-render-tracker-ui/spec.md`

## Summary

Build a developer-only React panel component that subscribes to the `renderStore`
singleton (feature 001) via `useSyncExternalStore` and renders a live,
devtools-like UI. The panel shows a component overview list with visual severity
badges, a detail drill-down view with render-reason history and prop diff rows,
and inline performance insights (high-render-count warnings + reference-stability
suggestions). The panel is gated behind `import.meta.env.DEV` and must not affect
any tracked component's render behaviour.

## Technical Context

**Language/Version**: TypeScript ~5.9.x (`strict: true`, `noUncheckedIndexedAccess: true`,
  `exactOptionalPropertyTypes: true`)  
**Primary Dependencies**: React ^19.2.x, `renderStore` (from `src/render-tracker`);
  no new runtime dependencies  
**Storage**: N/A — pure in-memory (`renderStore` singleton from feature 001)  
**Testing**: Vitest ^3.x + `@testing-library/react` ^16.x + `@testing-library/jest-dom`;
  `jsdom` environment (panel renders DOM)  
**Target Platform**: Browser (devtools overlay within a Vite dev server session)  
**Project Type**: React UI component library (internal devtool panel)  
**Performance Goals**: Panel must not cause additional renders in tracked components;
  update within one animation frame of a new store event  
**Constraints**: Dev-only (`import.meta.env.DEV` guard); panel must handle up to
  200 events per component without perceptible lag; WCAG 2.1 AA colour contrast;
  keyboard-navigable (FR-012)  
**Scale/Scope**: Single panel, ~5 components, no routing, no persistence

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Gate | Status | Notes |
|---|-----------|------|--------|-------|
| I | Component-First (React 19) | All UI as function components; side effects in custom hooks; no prop drilling >2 levels | ✅ PASS | Panel decomposed into `<RenderTrackerPanel>`, `<ComponentListView>`, `<ComponentDetailView>`, `<InsightBadge>`. `useSyncExternalStore` subscription isolated in a custom `useRenderSnapshot` hook. |
| II | TypeScript Strict Mode | All files `.tsx`/`.ts`; no `any`; explicit return types; `tsc --noEmit` clean | ✅ PASS | All view-model types (`ComponentSummary`, `RenderEventRow`, `PropValueDisplay`) defined with explicit annotations. No `any` required. |
| III | Test-First (NON-NEGOTIABLE) | Red→Green→Refactor; RTL tests on user-visible behaviour; ≥80% line coverage | ✅ PASS | Tests written before implementation; jsdom environment via Vitest; RTL tests assert rendered text and keyboard interactions. |
| IV | Performance & Bundle Discipline | Panel gated behind `import.meta.env.DEV`; no new dep >10 kB; no additional renders triggered in tracked components | ✅ PASS | Zero new runtime dependencies. `useSyncExternalStore` ensures the panel is the only subscriber re-rendering — tracked components are unaffected. |
| V | Accessibility & Semantic HTML | Keyboard operable; WCAG 2.1 AA contrast; semantic HTML; `jsx-a11y` zero errors | ✅ PASS | FR-012 prescribes roving focus, Enter/Space selection, Escape to close. `<ul>`, `<li>`, `<button>` elements used natively. |

## Project Structure

### Documentation (this feature)

```text
specs/002-render-tracker-ui/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/
│   └── public-api.md    ← Phase 1 output
└── tasks.md             ← Phase 2 output (/speckit.tasks — not yet created)
```

### Source Code (repository root)

```text
src/
├── render-tracker/           ← feature 001 (engine — do not modify)
│   ├── types.ts
│   ├── shallowDiff.ts
│   ├── store.ts
│   ├── useRenderTracker.ts
│   ├── useDevRenderTracker.ts
│   ├── index.ts
│   └── __tests__/
└── render-tracker-ui/        ← feature 002 (this feature)
    ├── index.ts              ← public barrel (DEV-gated export)
    ├── types.ts              ← view-model types
    ├── formatPropValue.ts    ← pure utility: PropValueDisplay formatter
    ├── computeSummaries.ts   ← pure selector: RenderEvent[] → ComponentSummary[]
    ├── useRenderSnapshot.ts  ← custom hook: useSyncExternalStore wrapper
    ├── RenderTrackerPanel.tsx ← root panel component
    ├── ComponentListView.tsx  ← overview list
    ├── ComponentDetailView.tsx ← per-component event history
    ├── InsightBadge.tsx       ← severity + insight indicators
    └── __tests__/
        ├── formatPropValue.test.ts
        ├── computeSummaries.test.ts
        ├── useRenderSnapshot.test.ts
        ├── ComponentListView.test.tsx
        ├── ComponentDetailView.test.tsx
        └── RenderTrackerPanel.test.tsx
```

**Structure Decision**: Single-project flat module under `src/render-tracker-ui/`,
mirroring the `src/render-tracker/` structure from feature 001. Pure functions and
view-model utilities are separated from React components so they can be tested in
the `node` Vitest environment. Component tests run in `jsdom`.

## Complexity Tracking

> No constitution violations requiring justification in this feature.
> The ESLint `react-hooks/refs` variance from feature 001 is contained in
> `src/render-tracker/useRenderTracker.ts` and is not repeated here.
