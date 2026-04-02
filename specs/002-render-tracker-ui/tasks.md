# Tasks: Render Tracker DevTool Panel

**Feature**: `002-render-tracker-ui`
**Input**: Design documents from `/specs/002-render-tracker-ui/`
**Prerequisites**: plan.md ✅ · spec.md ✅ · research.md ✅ · data-model.md ✅ · contracts/public-api.md ✅ · quickstart.md ✅

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (isolated file, no dependency on an incomplete sibling task in the same phase)
- **[Story]**: User story this task belongs to ([US1], [US2], [US3])
- Exact file paths included in every description

---

## Phase 1: Setup

**Purpose**: Scaffold the `render-tracker-ui` module directory and extend the
Vitest configuration to cover the new module.

- [X] T001 Create `src/render-tracker-ui/__tests__/` directory skeleton with a `.gitkeep` placeholder at `src/render-tracker-ui/__tests__/.gitkeep`
- [X] T002 Extend `vitest.config.ts`: add `src/render-tracker-ui/**` to `coverage.include`, exclude `src/render-tracker-ui/__tests__/**` from coverage, and add `environmentMatchGlobs` entries routing `formatPropValue.test.ts` and `computeSummaries.test.ts` to `'node'` environment

---

## Phase 2: Foundational (Blocking Prerequisite)

**Purpose**: Types file that all tests and implementations in Phases 3–5 depend on.
Must be complete before any test file is written.

**⚠️ CRITICAL**: No user-story work can begin until this phase is complete.

- [X] T003 Create `src/render-tracker-ui/types.ts` with all view-model types: `SeverityLevel`, `PropValueDisplay` (branded string), `PropDiffRow`, `RenderEventRow`, `ComponentSummary`, `RenderTrackerPanelProps` — all fields `readonly`; imports `RenderReason` from `../render-tracker`

**Checkpoint**: `tsc --noEmit` must pass on the types file before proceeding.

---

## Phase 3: User Story 1 — Live Component Overview (Priority: P1) 🎯 MVP

**Goal**: Subscribe to `renderStore`, derive severity-categorised summaries, and render a live component list with colour-coded badges and an empty-state fallback. No selection interaction yet.

**Independent Test**: Pre-populate `renderStore` with events for two components (3 and 25 renders respectively), mount `<RenderTrackerPanel />`, assert both names, correct counts, and correct severity level labels appear. Dispatch a new event and assert the count updates without user interaction. Assert empty-state message when the store is empty.

### Tests for User Story 1 *(write first — TDD red gate)*

- [X] T004 [P] [US1] Write `src/render-tracker-ui/__tests__/formatPropValue.test.ts` (node env): 10 cases covering string, empty string, number, boolean, null, undefined, array, object, function, symbol
- [X] T005 [P] [US1] Write `src/render-tracker-ui/__tests__/computeSummaries.test.ts` (node env): cases for empty snapshot, low/medium/high severity thresholds, `totalRenderCount`, and `latestReason` — insight fields (`hasHighRenderWarning`, `hasReferenceInstabilityHint`) are covered in Phase 5 T018
- [X] T006 [P] [US1] Write `src/render-tracker-ui/__tests__/useRenderSnapshot.test.ts` (jsdom): empty store returns empty summaries; summaries reflect store state; summaries update reactively on `store.append`
- [X] T007 [US1] Write `src/render-tracker-ui/__tests__/ComponentListView.test.tsx` (jsdom): empty-state message; row per summary with name and count; severity label per row; `onSelect` called with component name on row click; new component added without displacing existing rows

### Implementation for User Story 1

- [X] T008 [P] [US1] Implement `src/render-tracker-ui/formatPropValue.ts`: pure function `formatPropValue(value: unknown): PropValueDisplay` per data-model formatting rules; `as PropValueDisplay` cast with inline cast-safety comment
- [X] T009 [P] [US1] Implement `src/render-tracker-ui/computeSummaries.ts`: pure selector `computeSummaries(snapshot): ComponentSummary[]`; derive `severityLevel` (1–5 low, 6–20 medium, >20 high), `totalRenderCount`, `latestReason`; stub `hasHighRenderWarning: false` and `hasReferenceInstabilityHint: false` (filled in Phase 5)
- [X] T010 [US1] Implement `src/render-tracker-ui/useRenderSnapshot.ts`: `useRenderSnapshot()` hook using `useSyncExternalStore(renderStore.subscribe, renderStore.getSnapshot)` then calling `computeSummaries`; return type `{ summaries: ComponentSummary[] }`
- [X] T011 [US1] Implement `src/render-tracker-ui/ComponentListView.tsx`: `<ComponentListView summaries={…} onSelect={…} />` renders `<ul>` with one `<li>` per summary showing component name, count, severity badge; empty-state `<p>` when `summaries.length === 0`; each row is a `<button>` calling `onSelect(componentName)`
- [X] T012 [US1] Implement `src/render-tracker-ui/RenderTrackerPanel.tsx`: root component consuming `useRenderSnapshot`; renders `<ComponentListView>` in overview mode only; `selectedComponentName` state initialised to `null`; `onSelect` callback updates state (navigation used in Phase 4)

**Checkpoint**: US1 is independently testable. `npm test -- --run` should show all T004–T007 tests passing. The panel correctly shows a live component list with severity badges and an empty-state message.

---

## Phase 4: User Story 2 — Component Detail View (Priority: P2)

**Goal**: Selecting a component row opens a detail pane showing the ordered render history with reason labels, prop diff rows (prev → next), and back navigation via button or Escape key.

**Independent Test**: Pre-populate `renderStore` with a known event sequence for one component (all three reason types). Mount `<RenderTrackerPanel />`, click the component row, assert the detail pane appears with events in order, correct reasons, prop diff cells, and "no prop changes" message for `parent-render` events. Press Escape and assert the overview list is restored.

### Tests for User Story 2 *(write first — TDD red gate)*

- [X] T013 [P] [US2] Write `src/render-tracker-ui/__tests__/computeEventRows.test.ts` (node env): correct `renderNumber` assignment; `propDiffRows` is empty for `parent-render`; `prevDisplay` is `'—'` when `prevProps[key]` is absent; `changeType` reflects `valueChangedKeys` vs `referenceChangedKeys` from engine `DiffResult`
- [X] T014 [P] [US2] Write `src/render-tracker-ui/__tests__/ComponentDetailView.test.tsx` (jsdom): events listed in order with render number and reason; prop diff rows show key, prev, next; `parent-render` row shows "no prop changes" message; new event appended live without re-selection; back button restores overview; Escape key closes detail

### Implementation for User Story 2

- [X] T015 [US2] Implement `src/render-tracker-ui/computeEventRows.ts`: pure function `computeEventRows(events: readonly RenderEvent[]): RenderEventRow[]`; maps each event to `{ renderNumber, reason, propDiffRows }`; uses `formatPropValue`; `prevDisplay` is `'—' as PropValueDisplay` when key absent in `prevProps`; derives `changeType` from engine's `referenceChangedKeys` set
- [X] T016 [US2] Implement `src/render-tracker-ui/ComponentDetailView.tsx`: `<ComponentDetailView componentName={…} events={…} onClose={…} />`; renders ordered event rows; each row shows render number, reason chip, and prop diff `<table>` when `propDiffRows.length > 0` or "No prop changes detected." otherwise; back `<button>` calls `onClose`; `useEffect` adds `keydown` listener for Escape → `onClose`; `aria-live="polite"` on the event list
- [X] T017 [US2] Extend `src/render-tracker-ui/RenderTrackerPanel.tsx`: wire `selectedComponentName` state; pass `onSelect` → `setSelectedComponentName`; conditionally render `<ComponentDetailView>` when `selectedComponentName !== null`, passing filtered events from snapshot; `onClose` → `setSelectedComponentName(null)` with focus returned to list

**Checkpoint**: US2 is independently testable. `npm test -- --run` shows T013–T014 passing. Selecting a component opens the detail pane; Escape closes it; live events append without re-selection.

---

## Phase 5: User Story 3 — Performance Insights (Priority: P3)

**Goal**: Extend the overview list rows with inline insight indicators: a "high render count" warning (>20 renders) and a "consider stabilising references" hint (last 5+ consecutive renders all `reference-change`), each with accessible tooltip context.

**Independent Test**: Pre-populate `renderStore` with (a) a component with 21 events and (b) a component with 5 consecutive `reference-change` events. Mount `<RenderTrackerPanel />` and assert case (a) shows a high-render warning element and case (b) shows a reference-instability hint element. Assert a component with 20 events (boundary) shows no warning.

### Tests for User Story 3 *(write first — TDD red gate)*

- [X] T018 [US3] Extend `src/render-tracker-ui/__tests__/computeSummaries.test.ts` with insight test cases: `hasHighRenderWarning` true only when `totalRenderCount > 20`; boundary case at exactly 20 (false); `hasReferenceInstabilityHint` true when last 5 renders are all `reference-change`; false when fewer than 5 events; false when last 5 include at least one non-`reference-change` reason

### Implementation for User Story 3

- [X] T019 [US3] Extend `src/render-tracker-ui/computeSummaries.ts`: replace the Phase 3 stubs — set `hasHighRenderWarning: totalRenderCount > 20`; compute `hasReferenceInstabilityHint` by checking `events.slice(-5)` (only set to `true` when `tail.length >= 5` and every element has `reason === 'reference-change'`)
- [X] T020 [P] [US3] Implement `src/render-tracker-ui/InsightBadge.tsx`: `<InsightBadge hasHighRenderWarning={…} hasReferenceInstabilityHint={…} />`; renders `<span>` elements (one per active insight) with `title` prop and `aria-label` for screen reader; warning label text includes "high render count"; hint label text includes "useMemo" or "useCallback"; renders nothing when both flags are false
- [X] T021 [US3] Extend `src/render-tracker-ui/ComponentListView.tsx` row to include `<InsightBadge hasHighRenderWarning={summary.hasHighRenderWarning} hasReferenceInstabilityHint={summary.hasReferenceInstabilityHint} />` (depends on T020)

**Checkpoint**: US3 is independently testable. `npm test -- --run` shows extended T018 cases passing. The overview list shows warning/hint badges on correct components.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Integration smoke test, public barrel, and CI gate validation.

- [X] T022 Write `src/render-tracker-ui/__tests__/RenderTrackerPanel.test.tsx` (jsdom): full-panel integration smoke test — mount panel with pre-populated store; assert component list renders; click row, assert detail opens; press Escape, assert overview restored; trigger new render event, assert live update in both overview and open detail pane
- [X] T023 Create `src/render-tracker-ui/index.ts` public barrel: export all view-model types and `RenderTrackerPanel`; add inline comment documenting `import.meta.env.DEV` usage requirement per FR-013
- [X] T024 [P] Run `tsc --noEmit` and confirm zero type errors across `src/render-tracker-ui/` — fix any remaining strict-mode violations before merge
- [X] T025 [P] Run `npm run test:coverage` and confirm all tests pass and line coverage on `src/render-tracker-ui/` meets ≥80% threshold; confirm feature-001 tests (30 tests) remain unaffected

---

## Dependency Graph

```text
Phase 1 (T001–T002)
    └─▶ Phase 2 (T003 — types)
            └─▶ Phase 3 (US1: T004–T012)
                    └─▶ Phase 4 (US2: T013–T017)
                            └─▶ Phase 5 (US3: T018–T021)
                                    └─▶ Phase 6 (T022–T025)
```

Within Phase 3 (US1):
```text
T003
├─▶ T004 [P] — formatPropValue.test.ts
├─▶ T005 [P] — computeSummaries.test.ts (US1 cases)
├─▶ T006 [P] — useRenderSnapshot.test.ts
└─▶ T007    — ComponentListView.test.tsx
      [all 4 tests must be red before T008]
T008 [P] ─┐
T009 [P] ─┘ (parallel impl)
T010 ─▶ T011 ─▶ T012
```

Within Phase 4 (US2):
```text
T013 [P] ─┐ (parallel red-gate tests)
T014 [P] ─┘
T015 ─▶ T016 ─▶ T017
```

Within Phase 5 (US3):
```text
T018 (extend existing test)
T019 ─▶ T021
T020 [P] ─▶ T021  (T021 waits for both T019 and T020)
```

---

## Parallel Execution Examples

### Phase 3 — US1 test files (after T003)

```bash
# Three agents working simultaneously:
# Agent A → T004: formatPropValue.test.ts
# Agent B → T005: computeSummaries.test.ts
# Agent C → T006: useRenderSnapshot.test.ts + T007: ComponentListView.test.tsx
```

### Phase 3 — US1 pure implementations (after red gate confirmed)

```bash
# Two agents working simultaneously:
# Agent A → T008: formatPropValue.ts
# Agent B → T009: computeSummaries.ts
# (T010 starts after T009 is green)
```

### Phase 4 — US2 test files

```bash
# Two agents working simultaneously:
# Agent A → T013: computeEventRows.test.ts
# Agent B → T014: ComponentDetailView.test.tsx
```

### Phase 5 — US3 badge + selector

```bash
# Two agents working simultaneously:
# Agent A → T019: extend computeSummaries.ts
# Agent B → T020: InsightBadge.tsx
# (T021 starts after both are green)
```

---

## Implementation Strategy

**MVP scope (just US1)**: Complete T001–T012. Delivers a live, auto-updating
component list with severity badges. Independently demonstrable to stakeholders.

**Full increment order**: US1 → US2 → US3 → Polish. Each story adds a complete
debugging capability on top of the previous one.

**TDD discipline**: Within each user-story phase, all test tasks MUST be written
and confirmed failing (module-not-found or assertion failure) before the first
implementation task in that phase is started. Do not skip the red gate.

---

## Task Validation Table

| Task | Phase | Story | [P]? | File Path |
|------|-------|-------|------|-----------|
| T001 | Setup | — | | `src/render-tracker-ui/__tests__/.gitkeep` |
| T002 | Setup | — | | `vitest.config.ts` |
| T003 | Foundation | — | | `src/render-tracker-ui/types.ts` |
| T004 | US1 | US1 | ✅ | `src/render-tracker-ui/__tests__/formatPropValue.test.ts` |
| T005 | US1 | US1 | ✅ | `src/render-tracker-ui/__tests__/computeSummaries.test.ts` |
| T006 | US1 | US1 | ✅ | `src/render-tracker-ui/__tests__/useRenderSnapshot.test.ts` |
| T007 | US1 | US1 | | `src/render-tracker-ui/__tests__/ComponentListView.test.tsx` |
| T008 | US1 | US1 | ✅ | `src/render-tracker-ui/formatPropValue.ts` |
| T009 | US1 | US1 | ✅ | `src/render-tracker-ui/computeSummaries.ts` |
| T010 | US1 | US1 | | `src/render-tracker-ui/useRenderSnapshot.ts` |
| T011 | US1 | US1 | | `src/render-tracker-ui/ComponentListView.tsx` |
| T012 | US1 | US1 | | `src/render-tracker-ui/RenderTrackerPanel.tsx` |
| T013 | US2 | US2 | ✅ | `src/render-tracker-ui/__tests__/computeEventRows.test.ts` |
| T014 | US2 | US2 | ✅ | `src/render-tracker-ui/__tests__/ComponentDetailView.test.tsx` |
| T015 | US2 | US2 | | `src/render-tracker-ui/computeEventRows.ts` |
| T016 | US2 | US2 | | `src/render-tracker-ui/ComponentDetailView.tsx` |
| T017 | US2 | US2 | | `src/render-tracker-ui/RenderTrackerPanel.tsx` (extend) |
| T018 | US3 | US3 | | `src/render-tracker-ui/__tests__/computeSummaries.test.ts` (extend) |
| T019 | US3 | US3 | | `src/render-tracker-ui/computeSummaries.ts` (extend) |
| T020 | US3 | US3 | ✅ | `src/render-tracker-ui/InsightBadge.tsx` |
| T021 | US3 | US3 | | `src/render-tracker-ui/ComponentListView.tsx` (extend) |
| T022 | Polish | — | | `src/render-tracker-ui/__tests__/RenderTrackerPanel.test.tsx` |
| T023 | Polish | — | | `src/render-tracker-ui/index.ts` |
| T024 | Polish | — | ✅ | (tsc --noEmit validation) |
| T025 | Polish | — | ✅ | (npm run test:coverage validation) |
