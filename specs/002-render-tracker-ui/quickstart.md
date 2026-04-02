# Quickstart: Render Tracker DevTool Panel (TDD Guide)

**Feature**: 002-render-tracker-ui
**Date**: 2026-04-02
**Prerequisite**: Feature 001 (`src/render-tracker/`) fully implemented and passing.

This guide walks through the TDD cycle for each implementation unit. Follow the
Red → Green → Refactor discipline: write the test, confirm it fails, implement the
minimum code to make it pass, then refactor.

---

## Step 0: Verify prerequisites

```bash
npm test -- --run          # All 30 feature-001 tests should pass
npm run lint               # Zero errors
```

Confirm the engine barrel exports `renderStore`, `useRenderTracker`, and types.

---

## Step 1: Types file

Create `src/render-tracker-ui/types.ts` with all view-model types from the data
model: `SeverityLevel`, `ComponentSummary`, `PropValueDisplay`, `PropDiffRow`,
`RenderEventRow`, `RenderTrackerPanelProps`.

No test file needed — types are validated by `tsc --noEmit` automatically.

```typescript
// src/render-tracker-ui/types.ts

import type { RenderReason } from '../render-tracker';

export type SeverityLevel = 'low' | 'medium' | 'high';

export type PropValueDisplay = string & { readonly __brand: 'PropValueDisplay' };

export interface PropDiffRow {
  readonly key: string;
  readonly prevDisplay: PropValueDisplay;
  readonly nextDisplay: PropValueDisplay;
  readonly changeType: 'value-change' | 'reference-change';
}

export interface RenderEventRow {
  readonly renderNumber: number;
  readonly reason: RenderReason;
  readonly propDiffRows: readonly PropDiffRow[];
}

export interface ComponentSummary {
  readonly componentName: string;
  readonly totalRenderCount: number;
  readonly severityLevel: SeverityLevel;
  readonly latestReason: RenderReason;
  readonly hasHighRenderWarning: boolean;
  readonly hasReferenceInstabilityHint: boolean;
}

export interface RenderTrackerPanelProps {
  readonly className?: string | undefined;
}
```

---

## Step 2: `formatPropValue` (TDD — node environment)

### Write the test first

```typescript
// src/render-tracker-ui/__tests__/formatPropValue.test.ts
// @vitest-environment node

import { describe, it, expect } from 'vitest';
import { formatPropValue } from '../formatPropValue';

describe('formatPropValue', () => {
  it('formats a non-empty string as verbatim', () => {
    expect(formatPropValue('hello')).toBe('hello');
  });
  it('formats an empty string as two double quotes', () => {
    expect(formatPropValue('')).toBe('""');
  });
  it('formats a number', () => {
    expect(formatPropValue(42)).toBe('42');
  });
  it('formats a boolean', () => {
    expect(formatPropValue(false)).toBe('false');
  });
  it('formats null', () => {
    expect(formatPropValue(null)).toBe('null');
  });
  it('formats undefined', () => {
    expect(formatPropValue(undefined)).toBe('undefined');
  });
  it('formats an array as [array]', () => {
    expect(formatPropValue([1, 2, 3])).toBe('[array]');
  });
  it('formats a plain object as [object]', () => {
    expect(formatPropValue({ a: 1 })).toBe('[object]');
  });
  it('formats a function as [function]', () => {
    expect(formatPropValue(() => {})).toBe('[function]');
  });
  it('formats a symbol as [symbol]', () => {
    expect(formatPropValue(Symbol('x'))).toBe('[symbol]');
  });
});
```

### Implement

```typescript
// src/render-tracker-ui/formatPropValue.ts

import type { PropValueDisplay } from './types';

export function formatPropValue(value: unknown): PropValueDisplay {
  if (value === null) return 'null' as PropValueDisplay;
  if (value === undefined) return 'undefined' as PropValueDisplay;
  if (typeof value === 'string') return (value === '' ? '""' : value) as PropValueDisplay;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value) as PropValueDisplay;
  }
  if (typeof value === 'symbol') return '[symbol]' as PropValueDisplay;
  if (typeof value === 'function') return '[function]' as PropValueDisplay;
  if (Array.isArray(value)) return '[array]' as PropValueDisplay;
  return '[object]' as PropValueDisplay;
}
```

---

## Step 3: `computeSummaries` (TDD — node environment)

### Write the test first

```typescript
// src/render-tracker-ui/__tests__/computeSummaries.test.ts
// @vitest-environment node

import { describe, it, expect } from 'vitest';
import { computeSummaries } from '../computeSummaries';
import type { RenderEvent } from '../../render-tracker';

function makeEvent(
  componentName: string,
  overrides: Partial<RenderEvent> = {},
): RenderEvent {
  return {
    componentName,
    renderCount: 1,
    timestamp: Date.now(),
    reason: 'parent-render',
    changedKeys: [],
    prevProps: null,
    currentProps: {},
    ...overrides,
  };
}

describe('computeSummaries', () => {
  it('returns empty array for empty snapshot', () => {
    expect(computeSummaries({})).toEqual([]);
  });

  it('assigns low severity for 1–5 renders', () => {
    const events = Array.from({ length: 3 }, (_, i) =>
      makeEvent('A', { renderCount: i + 1 }),
    );
    const [summary] = computeSummaries({ A: events });
    expect(summary!.severityLevel).toBe('low');
    expect(summary!.totalRenderCount).toBe(3);
  });

  it('assigns medium severity for 6–20 renders', () => {
    const events = Array.from({ length: 10 }, (_, i) =>
      makeEvent('B', { renderCount: i + 1 }),
    );
    const [summary] = computeSummaries({ B: events });
    expect(summary!.severityLevel).toBe('medium');
  });

  it('assigns high severity and sets warning for >20 renders', () => {
    const events = Array.from({ length: 21 }, (_, i) =>
      makeEvent('C', { renderCount: i + 1 }),
    );
    const [summary] = computeSummaries({ C: events });
    expect(summary!.severityLevel).toBe('high');
    expect(summary!.hasHighRenderWarning).toBe(true);
  });

  it('does NOT set high render warning at exactly 20 renders', () => {
    const events = Array.from({ length: 20 }, (_, i) =>
      makeEvent('D', { renderCount: i + 1 }),
    );
    const [summary] = computeSummaries({ D: events });
    expect(summary!.hasHighRenderWarning).toBe(false);
  });

  it('sets reference instability hint when last 5 renders are all reference-change', () => {
    const events = Array.from({ length: 5 }, (_, i) =>
      makeEvent('E', { renderCount: i + 1, reason: 'reference-change' }),
    );
    const [summary] = computeSummaries({ E: events });
    expect(summary!.hasReferenceInstabilityHint).toBe(true);
  });

  it('does NOT set hint when fewer than 5 events exist', () => {
    const events = Array.from({ length: 4 }, (_, i) =>
      makeEvent('F', { renderCount: i + 1, reason: 'reference-change' }),
    );
    const [summary] = computeSummaries({ F: events });
    expect(summary!.hasReferenceInstabilityHint).toBe(false);
  });

  it('does NOT set hint when last 5 are not all reference-change', () => {
    const events = [
      makeEvent('G', { renderCount: 1, reason: 'reference-change' }),
      makeEvent('G', { renderCount: 2, reason: 'reference-change' }),
      makeEvent('G', { renderCount: 3, reason: 'reference-change' }),
      makeEvent('G', { renderCount: 4, reason: 'reference-change' }),
      makeEvent('G', { renderCount: 5, reason: 'props-change' }),
    ];
    const [summary] = computeSummaries({ G: events });
    expect(summary!.hasReferenceInstabilityHint).toBe(false);
  });
});
```

### Implement

```typescript
// src/render-tracker-ui/computeSummaries.ts

import type { RenderEvent } from '../render-tracker';
import type { ComponentSummary, SeverityLevel } from './types';

const HINT_WINDOW = 5;

function deriveSeverity(count: number): SeverityLevel {
  if (count <= 5) return 'low';
  if (count <= 20) return 'medium';
  return 'high';
}

export function computeSummaries(
  snapshot: Readonly<Record<string, readonly RenderEvent[]>>,
): ComponentSummary[] {
  return Object.entries(snapshot).map(([componentName, events]) => {
    const totalRenderCount = events.length;
    const lastEvent = events[totalRenderCount - 1]!;
    const tail = events.slice(-HINT_WINDOW);
    const hasReferenceInstabilityHint =
      tail.length >= HINT_WINDOW &&
      tail.every((e) => e.reason === 'reference-change');

    return {
      componentName,
      totalRenderCount,
      severityLevel: deriveSeverity(totalRenderCount),
      latestReason: lastEvent.reason,
      hasHighRenderWarning: totalRenderCount > 20,
      hasReferenceInstabilityHint,
    };
  });
}
```

---

## Step 4: `useRenderSnapshot` hook (TDD — jsdom environment)

```typescript
// src/render-tracker-ui/__tests__/useRenderSnapshot.test.ts

import { describe, it, expect, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { renderStore } from '../../render-tracker';
import { useRenderSnapshot } from '../useRenderSnapshot';

afterEach(() => { renderStore.clear(); });

describe('useRenderSnapshot', () => {
  it('returns empty summaries when store is empty', () => {
    const { result } = renderHook(() => useRenderSnapshot());
    expect(result.current.summaries).toEqual([]);
  });

  it('returns summaries reflecting store state', () => {
    renderStore.append({
      componentName: 'Alpha',
      renderCount: 1,
      timestamp: 0,
      reason: 'props-change',
      changedKeys: ['x'],
      prevProps: null,
      currentProps: { x: 1 },
    });
    const { result } = renderHook(() => useRenderSnapshot());
    expect(result.current.summaries).toHaveLength(1);
    expect(result.current.summaries[0]!.componentName).toBe('Alpha');
  });

  it('updates summaries reactively when store changes', () => {
    const { result } = renderHook(() => useRenderSnapshot());
    expect(result.current.summaries).toHaveLength(0);
    act(() => {
      renderStore.append({
        componentName: 'Beta',
        renderCount: 1,
        timestamp: 0,
        reason: 'parent-render',
        changedKeys: [],
        prevProps: null,
        currentProps: {},
      });
    });
    expect(result.current.summaries).toHaveLength(1);
  });
});
```

### Implement

```typescript
// src/render-tracker-ui/useRenderSnapshot.ts

import { useSyncExternalStore } from 'react';
import { renderStore } from '../render-tracker';
import { computeSummaries } from './computeSummaries';
import type { ComponentSummary } from './types';

interface RenderSnapshot {
  readonly summaries: ComponentSummary[];
}

export function useRenderSnapshot(): RenderSnapshot {
  const snapshot = useSyncExternalStore(
    renderStore.subscribe.bind(renderStore),
    renderStore.getSnapshot.bind(renderStore),
  );
  const summaries = computeSummaries(snapshot);
  return { summaries };
}
```

---

## Step 5: Component tests (jsdom)

Write tests for `<ComponentListView>`, `<ComponentDetailView>`, and the root
`<RenderTrackerPanel>` before implementing the components. Follow the RTL
guiding principle: assert on user-visible text and ARIA roles, never on internal
state.

### Example: ComponentListView test sketch

```typescript
// src/render-tracker-ui/__tests__/ComponentListView.test.tsx

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentListView } from '../ComponentListView';

const summary = (name: string, count: number) => ({
  componentName: name,
  totalRenderCount: count,
  severityLevel: count <= 5 ? 'low' : count <= 20 ? 'medium' : 'high',
  latestReason: 'parent-render',
  hasHighRenderWarning: count > 20,
  hasReferenceInstabilityHint: false,
} as const);

describe('ComponentListView', () => {
  it('shows empty-state when no summaries', () => {
    render(<ComponentListView summaries={[]} onSelect={() => {}} />);
    expect(screen.getByText(/no components tracked/i)).toBeInTheDocument();
  });

  it('renders a row for each summary', () => {
    render(
      <ComponentListView
        summaries={[summary('Alpha', 3), summary('Beta', 25)]}
        onSelect={() => {}}
      />,
    );
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
  });

  it('calls onSelect with component name when row is clicked', async () => {
    const onSelect = vi.fn();
    render(
      <ComponentListView summaries={[summary('Alpha', 3)]} onSelect={onSelect} />,
    );
    await userEvent.click(screen.getByRole('option', { name: /alpha/i }));
    expect(onSelect).toHaveBeenCalledWith('Alpha');
  });
});
```

---

## Running tests

```bash
# All tests (feature 001 + 002)
npm test -- --run

# Watch mode during development
npm run test:watch

# Coverage report
npm run test:coverage
```

Coverage threshold: ≥ 80% line coverage on `src/render-tracker-ui/`.

---

## Integration with App.tsx

```tsx
// src/App.tsx (development preview only)
import { useRenderTracker } from './render-tracker';
import { RenderTrackerPanel } from './render-tracker-ui';

function Counter({ count }: { count: number }) {
  useRenderTracker('Counter', { count });
  return <p>Count: {count}</p>;
}

export function App() {
  return (
    <>
      <Counter count={42} />
      {import.meta.env.DEV && <RenderTrackerPanel />}
    </>
  );
}
```
