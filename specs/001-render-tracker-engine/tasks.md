---
description: "Task list for 001-render-tracker-engine implementation"
---

# Tasks: Lightweight UI Re-render Detection Engine

**Input**: Design documents from `specs/001-render-tracker-engine/`
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/public-api.md ✅ quickstart.md ✅

**Tests**: Included — required by Constitution Principle III (Test-First, NON-NEGOTIABLE) and spec SC-004 (100% line coverage, headless).

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no incomplete task dependency)
- **[Story]**: Which user story this task belongs to (US1–US4)
- Exact file paths included in all descriptions

## Path Conventions

Single-project layout: all engine code under `src/render-tracker/`, all tests under `src/render-tracker/__tests__/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install missing dependencies, configure the test runner, add npm scripts.

- [X] T001 Install Vitest, @testing-library/react, @testing-library/jest-dom, and jsdom as dev dependencies via `npm install --save-dev vitest @testing-library/react @testing-library/jest-dom jsdom`
- [X] T002 [P] Create `vitest.config.ts` at project root with jsdom default environment, environmentMatchGlobs for node-only utility test files, vitest.setup.ts reference, and v8 coverage config scoped to `src/render-tracker/**`
- [X] T003 [P] Create `vitest.setup.ts` at project root importing `@testing-library/jest-dom`
- [X] T004 Add `test`, `test:watch`, and `test:coverage` scripts to `package.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Type definitions that ALL user stories, tests, and implementations depend on.

**⚠️ CRITICAL**: No user-story work can begin until T005–T006 are complete.

- [X] T005 Create `src/render-tracker/__tests__/` directory by adding a `.gitkeep` placeholder
- [X] T006 Create `src/render-tracker/types.ts` defining exported types: `RenderReason` (union), `DiffResult` (interface with `reason`, `changedKeys`, `valueChangedKeys`, `referenceChangedKeys`), `RenderEvent` (interface with all fields from data-model.md), `RenderTrackResult` (interface with `componentName`, `renderCount`, `reason`, `changedKeys`)

**Checkpoint**: Foundation ready — all four story phases can now begin

---

## Phase 3: User Story 1 — Attach Tracking to a Component (Priority: P1) 🎯 MVP

**Goal**: A developer calls `useRenderTracker(name, props)` in one component and
immediately receives render count, timestamp, reason, and changed keys on every render.

**Independent Test**: Render a tracked component multiple times with varied props;
assert each render produces a correctly populated `RenderTrackResult` and a matching
`RenderEvent` in the global store.

### Tests for User Story 1 ⚠️ Write these FIRST — they MUST FAIL before implementation

> **TDD gate**: Do not start T010–T013 until T007–T009 exist and fail with "module not found".

- [X] T007 [P] [US1] Create `src/render-tracker/__tests__/shallowDiff.test.ts` covering: null-prev → parent-render, primitive value change → props-change, identical props (same refs) → parent-render, missing key → props-change, priority: props-change wins over reference-change when both present
- [X] T008 [P] [US1] Create `src/render-tracker/__tests__/store.test.ts` covering: getLog on unknown component → empty array, append in order, subscriber notification on append, unsub stops notifications, getSnapshot identity changes after append, clear resets logs
- [X] T009 [US1] Create `src/render-tracker/__tests__/useRenderTracker.test.ts` covering: first render → count 1 + parent-render, re-render with new value → props-change + incremented count, re-render with same-value new array → reference-change, unchanged props → parent-render, useLayoutEffect appends RenderEvent to renderStore

### Implementation for User Story 1

- [X] T010 [P] [US1] Implement `src/render-tracker/shallowDiff.ts` with exported `shallowDiff(prev, next): DiffResult` and unexported `isShallowEqual(a, b): boolean`; two-pass algorithm: strict equality check first, then one-level own-key structural comparison; priority rule: props-change > reference-change > parent-render
- [X] T011 [P] [US1] Implement `src/render-tracker/store.ts` with `RenderStore` class containing `_logs: Map`, `_listeners: Set`, `_snapshot` field; implement `append`, `getLog`, `getAllLogs`, `subscribe` (returns unsubscribe fn), `getSnapshot`, `clear`; export module-level singleton `renderStore`
- [X] T012 [US1] Implement `src/render-tracker/useRenderTracker.ts` using `useRef` for prev-props snapshot and render-count tracking; call `shallowDiff` synchronously in render body; append `RenderEvent` to `renderStore` inside `useLayoutEffect` with empty dependency array; return `RenderTrackResult` (depends on T010, T011)
- [X] T013 [US1] Create `src/render-tracker/index.ts` barrel re-exporting `RenderReason`, `DiffResult`, `RenderEvent`, `RenderTrackResult` from `./types`; `shallowDiff` from `./shallowDiff`; `renderStore` from `./store`; `useRenderTracker` from `./useRenderTracker` (depends on T010, T011, T012)

**Checkpoint**: User Story 1 fully functional and independently testable — `useRenderTracker` attaches, classifies, and persists

---

## Phase 4: User Story 2 — Inspect the Global Render History (Priority: P2)

**Goal**: A developer queries `renderStore.getAllLogs()` or `renderStore.getLog(name)` and
retrieves a complete, ordered, per-component event history across the session.

**Independent Test**: Render two tracked components (`CompA`, `CompB`) several times each;
assert `getAllLogs()` returns both component logs with correct ordering and no cross-contamination.

### Tests for User Story 2 ⚠️ Write these FIRST — extend existing test files

- [X] T014 [P] [US2] Extend `src/render-tracker/__tests__/store.test.ts` with multi-component tests: three components appending events independently → `getAllLogs()` returns all three with correct per-component ordering; new event in CompA does not change CompB log reference; getLog on never-tracked name returns `[]` not an error
- [X] T015 [US2] Extend `src/render-tracker/__tests__/useRenderTracker.test.ts` with integration test: render two hooks with different names in the same test; after renders, assert `renderStore.getAllLogs()` contains both component names with non-overlapping events

### Implementation for User Story 2

- [X] T016 [US2] Confirm `src/render-tracker/store.ts` `getAllLogs()` returns a `ReadonlyMap` and that the snapshot returned by `getSnapshot()` changes identity only when `append()` is called (no additional code likely needed; fix any gaps found by T014–T015)

**Checkpoint**: User Story 2 fully functional — global history queryable per component and in aggregate

---

## Phase 5: User Story 3 — Distinguish Reference Changes from Value Changes (Priority: P3)

**Goal**: `shallowDiff` correctly classifies all edge cases: function prop replacements,
null/undefined transitions, key addition/removal, and mixed-change priority.

**Independent Test**: Import `shallowDiff` directly in a Node.js test; assert correct
`reason` and `changedKeys` for all classification categories including edge inputs.

### Tests for User Story 3 ⚠️ Write these FIRST — extend shallowDiff test file

- [X] T017 [P] [US3] Extend `src/render-tracker/__tests__/shallowDiff.test.ts` with edge case tests: inline function replaced each render → reference-change (not props-change); `undefined` value replacing a real value → props-change; key added in next but not in prev → props-change; two distinct `{}` objects with same primitive keys → reference-change; prev has key, next does not → props-change

### Implementation for User Story 3

- [X] T018 [US3] Audit `src/render-tracker/shallowDiff.ts` `isShallowEqual` to confirm: handles `null`/`undefined` operands without throwing; handles function values (zero own-keys → shallowly equal); handles array operands (compare by index/length using `Object.keys`); fix any gaps revealed by T017

**Checkpoint**: User Story 3 done — shallowDiff independently importable and all three classification categories verified with edge cases

---

## Phase 6: User Story 4 — Test the Engine Without a Browser (Priority: P4)

**Goal**: `shallowDiff.test.ts` and `store.test.ts` run to completion in a pure Node.js
environment with zero DOM globals accessed.

**Independent Test**: Run `vitest run src/render-tracker/__tests__/shallowDiff.test.ts` and
`vitest run src/render-tracker/__tests__/store.test.ts` with jsdom explicitly disabled; all
assertions pass.

### Tests for User Story 4

- [X] T019 [US4] Verify `vitest.config.ts` `environmentMatchGlobs` correctly routes `shallowDiff.test.ts` and `store.test.ts` to `node` environment (update T002 output if the glob patterns were not added then)

### Implementation for User Story 4

- [X] T020 [US4] Audit `src/render-tracker/types.ts`, `shallowDiff.ts`, and `store.ts` for any accidental use of browser globals (`window`, `document`, `localStorage`, etc.); remove or replace with framework-agnostic equivalents if found

**Checkpoint**: User Story 4 done — utility tests run headlessly in Node.js; hook tests use jsdom only via renderHook

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Production safety wrapper, TypeScript validation, and coverage gate.

- [X] T021 [P] Create `src/render-tracker/useDevRenderTracker.ts` exporting `useDevRenderTracker(name, props): RenderTrackResult` — returns a no-op `RenderTrackResult` when `import.meta.env.DEV` is falsy, delegating to `useRenderTracker` in dev; this avoids lint suppression at every call site
- [X] T022 [P] Run `tsc --noEmit` from project root; resolve any type errors in `src/render-tracker/**` (pay attention to `noUncheckedIndexedAccess` — add `?? []` guards on all `Map.get()` accesses)
- [X] T023 [P] Run `vitest run --coverage`; confirm line coverage ≥80% on `src/render-tracker/**`; add any missing test cases to reach threshold

---

## Dependency Graph

```
T001 (install deps)
  └─► T002 [P], T003 [P]    (vitest.config + setup — can run alongside T001)
  └─► T004                   (package.json scripts — after T001 modifies package.json)
  └─► T005                   (create __tests__/ dir)
        └─► T006             (types.ts — foundation gate)
              ├─► T007 [P]   (shallowDiff tests)
              ├─► T008 [P]   (store tests)
              └─► T009       (hook tests)
                    ├─► T010 [P]  (shallowDiff impl)
                    ├─► T011 [P]  (store impl)
                    └─► T012      (hook impl — needs T010, T011)
                          └─► T013  (barrel — needs T010, T011, T012)

After T013 (US1 complete):
  ├─► T014 [P], T015         (US2 tests)
  │     └─► T016             (US2 store verification)
  ├─► T017 [P]               (US3 edge case tests)
  │     └─► T018             (US3 shallowDiff audit)
  └─► T019                   (US4 env config)
        └─► T020             (US4 browser-global audit)

After all stories complete:
  └─► T021 [P], T022 [P], T023 [P]  (Polish — parallel)
```

**Story completion order**: US1 → (US2 ∥ US3 ∥ US4) → Polish

---

## Parallel Execution Examples

### Phase 1 (can parallelise T002, T003 after T001):
```
T001 → [T002 ∥ T003] → T004 → T005 → T006
```

### Phase 3 US1 (tests and impls in different files):
```
[T007 ∥ T008] → T009
[T010 ∥ T011] → T012 → T013
```

### Phases 4–6 (fully independent after US1):
```
[T014 ∥ T015 ∥ T017 ∥ T019]
```

### Polish (all independent):
```
[T021 ∥ T022 ∥ T023]
```

---

## Implementation Strategy

**MVP scope** (US1 only, ~2–3 hrs): T001–T013

After T013 is complete, a developer can attach `useRenderTracker` to any component and
immediately see structured render data. That alone delivers the full feature brief value.

US2, US3, US4 are incremental hardening of what is already working at US1 completion.

**Suggested delivery order**:
1. T001–T006 (Setup + Foundation) — unblock everything
2. T007–T009 (write all tests, verify red) — TDD gate
3. T010–T013 (implement to green) — MVP done
4. T014–T020 (harden US2, US3, US4) — production-quality
5. T021–T023 (polish) — CI-ready

---

## Validation: Task Count Summary

| Phase | Story | Tasks | Parallelisable |
|-------|-------|-------|----------------|
| 1 — Setup | — | 4 (T001–T004) | T002, T003 |
| 2 — Foundation | — | 2 (T005–T006) | — |
| 3 — Implementation | US1 | 7 (T007–T013) | T007, T008, T010, T011 |
| 4 — Global History | US2 | 3 (T014–T016) | T014 |
| 5 — Reference Diff | US3 | 2 (T017–T018) | T017 |
| 6 — Headless Tests | US4 | 2 (T019–T020) | — |
| 7 — Polish | — | 3 (T021–T023) | T021, T022, T023 |
| **Total** | | **23** | **10** |

**Independent test criteria per story**:
- **US1**: `vitest run useRenderTracker.test.ts` — all 4 acceptance scenarios pass
- **US2**: `vitest run store.test.ts` with multi-component cases — T014–T015 pass
- **US3**: `vitest run shallowDiff.test.ts` standalone with no hook or store import
- **US4**: `vitest run shallowDiff.test.ts store.test.ts` with explicit `--environment node` flag — zero DOM globals

**Format validation**: All 23 tasks follow `- [ ] [ID] [P?] [Story?] Description with file path`. ✅
