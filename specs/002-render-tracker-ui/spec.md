# Feature Specification: Render Tracker DevTool Panel

**Feature Branch**: `002-render-tracker-ui`
**Created**: 2026-04-02
**Status**: Draft
**Input**: User description: "Consume render logs from a global store, display a live devtool-like panel showing component render counts with visual indicators, per-component render reason and changed-props diff, and performance insights."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Live Component Overview (Priority: P1)

A developer opens the render tracker panel during a debugging session and
immediately sees a live list of every tracked component. Each row shows the
component name and its total render count. A colour-coded badge (green / amber /
red) makes the hottest components visible at a glance without reading numbers.
The list updates automatically every time any tracked component re-renders —
no manual refresh required.

**Why this priority**: This is the core MVP. Without a live component list with
visual heat indicators, none of the deeper drill-down stories are meaningful.
It delivers immediate value: a developer can spot the most-rendered component in
under three seconds.

**Independent Test**: Mount the panel alongside two test harness components that
are rendered different numbers of times. Confirm the panel shows both names,
correct counts, and the correct badge colour for each. Trigger additional renders
and confirm counts and badges update without any user interaction.

**Acceptance Scenarios**:

1. **Given** two components (`A` with 3 renders, `B` with 25 renders) have been
   tracked, **When** the panel is displayed, **Then** both component names appear, `A` shows render count 3 with a green badge, and `B` shows render count 25 with a red badge.

2. **Given** the panel is open and showing component `A` with 3 renders,
   **When** component `A` re-renders, **Then** `A`'s count increments to 4 and
   the badge updates accordingly — without any user gesture.

3. **Given** no components have been tracked yet, **When** the panel is
   displayed, **Then** a clear empty-state message is shown rather than a blank
   area.

4. **Given** components are listed, **When** a new component is tracked for the
   first time, **Then** it is added to the list without displacing or reordering
   existing entries.

---

### User Story 2 - Component Detail View (Priority: P2)

A developer suspects one specific component is responsible for a cascade. They
click the component's row in the overview list and a detail pane opens showing
the render history: for each render event, the reason (`props-change`,
`reference-change`, or `parent-render`), and — when a reason other than
`parent-render` is detected — a side-by-side diff of the previous vs. current
values for every changed prop key.

**Why this priority**: The overview (US1) tells you *which* component, but detail
(US2) tells you *why*. Together they form a complete debugging loop. US2 can be
built and tested independently because it only needs a selected component name and
a pre-populated store.

**Independent Test**: Pre-populate the store with a known sequence of render
events for a single component including all three reason types. Select the
component in the panel. Assert that the detail pane shows the correct history rows
in order, each row showing the correct reason label and, for non-`parent-render`
events, the correct changed prop display with prev and next values.

**Acceptance Scenarios**:

1. **Given** a component with three render events (first: `parent-render`; second:
   `props-change` on key `count` from `0` to `1`; third: `reference-change` on
   key `items`), **When** the developer selects the component, **Then** the detail
   pane lists all three events in order, the second row shows "`count`: `0` → `1`", and the third row shows "`items`" with a reference-change label.

2. **Given** the developer has selected a component and is viewing its detail
   pane, **When** that component re-renders again (new event), **Then** the new
   event appears at the bottom of the detail list without requiring a re-selection.

3. **Given** the developer selects a `parent-render` event row, **When** they
   inspect it, **Then** no changed prop rows are shown and a message explains that
   no prop changes were detected.

4. **Given** a `props-change` event where the previous value is `null` (first
   render was omitted), **When** displayed, **Then** the prev column shows "—"
   (or equivalent null indicator) rather than crashing.

5. **Given** the developer is in the detail pane for component `A`, **When**
   they click back / close the detail pane, **Then** the overview list is shown
   again and no component remains selected.

---

### User Story 3 - Performance Insights (Priority: P3)

A developer glances at the panel and sees inline warnings and suggestions
generated automatically from the render data. A component with a high total
render count shows a warning label. A component whose most-recent renders are
dominated by `reference-change` events shows a suggestion to stabilise object or
function references. These hints are lightweight and non-blocking — they appear
in the UI without any additional user action.

**Why this priority**: Insights close the loop from observation to action.
They are independently valuable and testable without US2 (they can be computed
from the overview list data alone, without the user entering the detail pane).
They are P3 because they add analytical value on top of observation, not core
navigation.

**Independent Test**: Pre-populate the store with controlled sequences:
(a) a component with >20 renders, (b) a component whose last 5 renders are all
`reference-change`. Assert that case (a) shows a high-render warning and case (b)
shows a reference-stability suggestion. Assert that a component with 5 renders and
all `parent-render` reasons shows neither.

**Acceptance Scenarios**:

1. **Given** a component has accumulated more than 20 render events, **When** the
   overview list is displayed, **Then** that component's row shows a
   "high render count" warning indicator alongside its count badge.

2. **Given** a component's most recent 5 or more consecutive renders are all
   classified as `reference-change`, **When** the overview list is displayed,
   **Then** that component's row shows a "consider stabilising references"
   suggestion. The suggestion text mentions `useMemo` or `useCallback` as
   applicable patterns.

3. **Given** a component has exactly 20 renders (at the threshold), **When**
   displayed, **Then** no high-render warning is shown (the threshold is >20,
   not ≥20).

4. **Given** a component has 25 renders but its last 5 are all `props-change`
   (not `reference-change`), **When** displayed, **Then** the high-render warning
   shows but no reference-stability suggestion is shown.

5. **Given** a component shows a reference-stability suggestion, **When** the
   developer hovers over or focuses the suggestion indicator, **Then** a tooltip
   or accessible description expands with actionable guidance explaining the
   pattern.

---

### Edge Cases

- What happens when the panel is mounted before any components have been tracked
  (empty store)?
- What if two tracked components have the same name string?
- What if a prop value in the diff is an object — should it be rendered as a
  truncated JSON representation or as a type label?
- What if the detail pane is open for component `A` and component `A` is not
  tracked any further (no new renders) — does the detail pane stay stable?
- What if the render event list for a single component grows very large (hundreds
  of entries) — is the detail pane list virtualised or page-limited?
- What if `prevProps` is `null` for a non-first render (data integrity edge case)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The panel MUST subscribe to the global render store reactively and
  reflect every new render event without requiring user interaction or a manual
  refresh.
- **FR-002**: The panel MUST display a list of all tracked component names with
  their total accumulated render counts.
- **FR-003**: Each component row MUST display a visual indicator (badge or icon)
  that communicates render frequency at a glance using at least three distinct
  visual states: low (1–5 renders), medium (6–20 renders), and high (>20 renders).
- **FR-004**: The panel MUST provide a detail view accessible by selecting a
  component row, showing the ordered history of render events for that component.
- **FR-005**: Each render event in the detail view MUST display the render number,
  the reason (`props-change`, `reference-change`, or `parent-render`), and — for
  non-`parent-render` events — the list of changed prop keys with their previous
  and current values.
- **FR-006**: Prop values displayed in the diff MUST be represented as readable
  strings. Non-primitive values (objects, arrays, functions) MUST be shown as a
  type label (e.g., `[object]`, `[array]`, `[function]`) rather than raw
  serialisation to avoid overflowing the UI.
- **FR-007**: The detail view MUST update live when new render events arrive for
  the selected component.
- **FR-008**: A component row MUST display a "high render count" warning when its
  total render count exceeds 20.
- **FR-009**: A component row MUST display a "consider stabilising references"
  suggestion when its 5 most recent consecutive render events are all classified
  as `reference-change`.
- **FR-010**: The suggestion indicator (FR-009) MUST provide accessible context
  mentioning `useMemo` or `useCallback` on focus or hover.
- **FR-011**: The panel MUST present a clear empty-state message when no
  components have been tracked.
- **FR-012**: The panel MUST be navigable by keyboard: component rows MUST be
  focusable and selectable via Enter or Space; a visible focus indicator MUST be
  present; the detail pane MUST be closeable via Escape.
- **FR-013**: The panel MUST NOT import or affect any production code path; it
  MUST be safe to render only inside an `import.meta.env.DEV` guard.

### Key Entities

- **ComponentSummary**: A derived view-model computed from the global store for
  one tracked component. Attributes: component name, total render count, heat
  level (`low` | `medium` | `high`), whether a high-render warning applies,
  whether a reference-stability suggestion applies.

- **RenderEventRow**: A display-ready representation of one `RenderEvent` in the
  detail view. Attributes: render number, reason label, changed-prop pairs (key,
  formatted previous value, formatted next value).

- **PropValueDisplay**: A formatted string representation of a single prop value
  for display. Primitives are shown as their string form; non-primitives are shown
  as a type label.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer can identify the highest-rendered component in a session
  of 10 or more tracked components within 5 seconds of opening the panel, using
  only visual cues (no need to read numbers).
- **SC-002**: After a component re-renders, its updated count and badge appear in
  the panel within one animation frame with no visible flicker or layout shift.
- **SC-003**: All interactive panel elements (row selection, back navigation,
  suggestion tooltip) are reachable and operable using only a keyboard, with no
  mouse required.
- **SC-004**: The panel renders correctly and all acceptance scenarios pass in a
  jsdom test environment using React Testing Library, with no dependency on a real
  browser or visual layout engine.
- **SC-005**: No panel-specific code is bundled in a production build; the panel
  module is excluded by a `import.meta.env.DEV` guard verified by build output
  inspection.
- **SC-006**: The detail view remains responsive (no perceptible hang) for a
  component with up to 200 render events displayed.

## Assumptions

- The global `renderStore` from feature `001-render-tracker-engine` is available
  and its `subscribe` / `getSnapshot` APIs are stable; the panel consumes them via
  `useSyncExternalStore`.
- The panel is a developer tool rendered inside the target application during
  development, not a standalone browser extension or separate window.
- The visual heat thresholds (low/medium/high) are fixed at 1–5 / 6–20 / >20
  for v1. They are not user-configurable in this iteration.
- The reference-stability suggestion threshold (5 consecutive `reference-change`
  renders) is fixed for v1 and is not user-configurable.
- Prop value display uses a best-effort formatted string; deep object diffing or
  JSON-pretty-printing is out of scope for v1.
- The detail view lists all events for the selected component without pagination
  for v1; virtualisation is noted as a future concern for very large histories
  (edge case SC-006 applies up to 200 events).
- The panel does not persist any state across page refreshes; it reflects only the
  in-memory `renderStore` content for the current session.
- Mobile / narrow viewport layout is out of scope for v1; the panel assumes a
  minimum width sufficient for a side-panel or bottom drawer in a desktop browser.

