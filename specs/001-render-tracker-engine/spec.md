# Feature Specification: Lightweight UI Re-render Detection Engine

**Feature Branch**: `001-render-tracker-engine`  
**Created**: 2026-04-02  
**Status**: Draft  
**Input**: User description: "Build a lightweight UI re-render detection engine."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Attach Tracking to a Component (Priority: P1)

A developer suspects a component is re-rendering too often. They add the render
tracker to that one component and, without any other wiring, immediately see the
render count, the timestamp of the latest render, the reason it fired, and which
prop keys triggered the change.

**Why this priority**: This is the primary entry point for the entire engine.
Without the ability to attach tracking and receive a structured result, no other
user story is possible. It delivers standalone value — a developer can debug a
single component in isolation.

**Independent Test**: Render a tracked component multiple times with varied props
and confirm that each render produces a correctly populated record containing
component name, render count, timestamp, reason, and changed keys.

**Acceptance Scenarios**:

1. **Given** a component that has never rendered, **When** the tracker is
   attached and the component renders for the first time, **Then** the record
   shows render count 1, reason `parent-render` (no previous props to diff), and
   an empty changed-keys list.

2. **Given** a component already tracked with props `{ value: 1 }`, **When** it
   re-renders with props `{ value: 2 }`, **Then** the record shows the incremented
   render count, reason `props-change`, and `changedKeys` containing `"value"`.

3. **Given** a component tracked with props `{ items: [1, 2] }`, **When** it
   re-renders with a new array object containing the same values `[1, 2]`,
   **Then** the record shows reason `reference-change` and `changedKeys`
   containing `"items"`.

4. **Given** a component tracked with unchanged props, **When** its parent
   re-renders and the component re-renders as a result, **Then** the record shows
   reason `parent-render` and an empty `changedKeys` list.

---

### User Story 2 - Inspect the Global Render History (Priority: P2)

A developer is debugging a performance regression that spans multiple components.
They open a developer tool panel (or query the store programmatically) to review
the full chronological render history across all tracked components, identifying
which component renders most and what is causing the cascade.

**Why this priority**: Application-wide visibility multiplies the value of
per-component tracking. Without a queryable history, developers must inspect
components one-by-one. This story enables pattern detection across a session.

**Independent Test**: Track two or more distinct components through several
renders each. Query the global store and verify it contains an accurate,
ordered record for every tracked component with no events missing or duplicated.

**Acceptance Scenarios**:

1. **Given** three components tracked separately over multiple renders, **When**
   the global store is queried, **Then** it returns an entry per component with
   the full ordered list of render events for each.

2. **Given** render events already in the store, **When** a new render occurs on
   any tracked component, **Then** that event is appended to the correct
   component's log without affecting other components' records.

3. **Given** the global store, **When** queried for a component name that has not
   yet rendered, **Then** it returns an empty record rather than an error.

---

### User Story 3 - Distinguish Reference Changes from Value Changes (Priority: P3)

A developer wants to identify prop "noise" — cases where a parent passes a new
object or function reference every render even though the underlying data has not
changed. Knowing this lets them introduce targeted memoisation or stable
references to eliminate unnecessary child re-renders.

**Why this priority**: Reference-vs-value distinction is what sets this engine
apart from a simple render counter. It provides actionable signal that guides
optimisation decisions. This story is separable and testable on its own via the
shallow diff utility.

**Independent Test**: Feed the shallow diff utility pairs of prop objects
covering all three outcomes (value change, reference-only change, no change) and
verify the correct classification and key list for each pair.

**Acceptance Scenarios**:

1. **Given** two prop snapshots where a key's primitive value differs, **When**
   the diff utility is called, **Then** it classifies that key as `props-change`.

2. **Given** two prop snapshots where a key holds two distinct object references
   that are shallowly equal (same keys and primitive values), **When** the diff
   utility is called, **Then** it classifies that key as `reference-change`.

3. **Given** two identical prop snapshots (same references, same values),
   **When** the diff utility is called, **Then** it returns no changed keys and
   signals `parent-render`.

4. **Given** a prop snapshot where a key is present in the previous snapshot but
   absent in the new one (or vice-versa), **When** the diff utility is called,
   **Then** it classifies that key as `props-change`.

---

### User Story 4 - Test the Engine Without a Browser (Priority: P4)

A team member writing automated tests for the tracker or for a component that
uses tracking wants to run assertions in a pure unit-test environment, with no
DOM or browser dependency.

**Why this priority**: Testability is a first-class requirement stated in the
feature brief. Without this, the engine cannot be validated reliably in CI and
its quality guarantees are weakened. It is independently achievable via the
engine's architecture choices alone.

**Independent Test**: Run the diff utility and the hook logic in a Node.js test
runner; confirm all assertions pass with zero browser or DOM APIs invoked.

**Acceptance Scenarios**:

1. **Given** a test suite importing the diff utility directly, **When** tests
   run in a headless Node.js environment, **Then** all assertions pass without
   requiring browser globals (`window`, `document`, etc.).

2. **Given** a test that exercises the hook through a lightweight React test
   renderer, **When** the component is rendered and re-rendered with controlled
   props, **Then** the tracked record reflects the expected data without needing
   a real browser.

---

### Edge Cases

- What happens when `componentName` is an empty string or duplicated across two
  distinct component instances?
- How does the tracker handle props that contain functions (e.g., event handlers
  created inline)?
- What happens if a prop value transitions to `undefined` or `null`?
- What happens when a prop object has deeply nested values — does shallow diff
  report a reference change or a value change at the top-level key?
- How does the engine behave in React Strict Mode, where components render twice
  in development (should double-render counts be suppressed or reported
  transparently)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The engine MUST expose a tracking hook that accepts a component
  name (string) and the component's current props (plain object), and returns a
  structured render record on every render.
- **FR-002**: The returned record MUST include: component name, cumulative render
  count, the reason for the current render, and the list of prop keys that
  changed.
- **FR-003**: The engine MUST record a timestamp for every render event.
- **FR-004**: The engine MUST retain a snapshot of the previous render's props
  alongside the current props for diff comparison.
- **FR-005**: The engine MUST classify every re-render into exactly one of three
  reasons: `props-change` (a prop's value changed), `reference-change` (same
  value, new object or function reference), or `parent-render` (no detectable
  prop change).
- **FR-006**: The diff classification MUST be determined by a standalone shallow
  diff utility that is importable and callable independently of the hook.
- **FR-007**: The shallow diff utility MUST detect and distinguish primitive value
  changes from reference-only changes for each top-level prop key.
- **FR-008**: All render events MUST be persisted in a centralized, globally
  accessible store for the duration of the application session.
- **FR-009**: The global store MUST be queryable by component name and return
  the full ordered list of render events for that component.
- **FR-010**: The engine MUST function without any dependency on browser-specific
  globals; all core logic MUST be exercisable in a Node.js testing environment.
- **FR-011**: The engine MUST NOT impose any observable visual UI of its own;
  consumers display data using their own presentation layer.

### Key Entities

- **RenderEvent**: A single record capturing one render occurrence. Attributes:
  component name, render count at the time of the event, ISO timestamp, reason
  (`props-change` | `reference-change` | `parent-render`), list of changed prop
  key names, snapshot of previous props, snapshot of current props.

- **RenderLog**: The ordered collection of `RenderEvent` records for a single
  tracked component, keyed by component name.

- **GlobalRenderStore**: The application-wide container holding all `RenderLog`
  entries. Provides read access to any component's history and write access to
  append new events.

- **ShallowDiff**: A pure utility that compares two prop snapshots and produces a
  diff result: which keys changed value, which changed reference only, and which
  are unchanged. Its output drives the reason classification in `RenderEvent`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Attaching tracking to a component requires no more than one line of
  code change per component; no additional providers, wrappers, or configuration
  are needed beyond the initial global store setup.
- **SC-002**: Render reason classification is correct for 100% of the three
  defined categories across all tested prop types (primitives, objects, arrays,
  functions).
- **SC-003**: The engine adds less than 1 ms of overhead per render for a
  component with up to 50 top-level props, measured in a development build.
- **SC-004**: All engine utilities and the hook achieve 100% line coverage through
  pure unit tests that do not require a real browser or DOM environment.
- **SC-005**: A developer can retrieve the complete render history for any tracked
  component at any point during the session with a single store query.
- **SC-006**: The engine correctly records and classifies every render during a
  session of 1,000 or more total render events across all tracked components
  without data loss or misclassification.

## Assumptions

- The engine is intended for development and debugging use only; production
  deployments are expected to disable or tree-shake it.
- Props passed to the tracking hook are plain objects with top-level keys holding
  primitives, arrays, or plain sub-objects. Circular references, `Symbol` keys,
  and `WeakMap` values are out of scope for v1.
- A "reference change with same value" is defined as two values that are not
  strictly referentially equal (`!==`) but produce no detectable difference under
  a one-level-deep (shallow) comparison of their enumerable own-keys and values.
- The global store retains all render events for the lifetime of the browser
  session. Automatic pruning or rotation is out of scope for v1.
- Tracked components are React function components; class components are out of
  scope in alignment with the project constitution.
- React Strict Mode double-invocation in development is a known environment
  behaviour; the engine reports all invocations transparently and does not attempt
  to suppress duplicates.
- The choice between React Context and a third-party state primitive for the
  global store is an implementation decision deferred to `/speckit.plan`.

