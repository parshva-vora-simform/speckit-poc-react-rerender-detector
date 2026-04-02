# Quickstart: Lightweight UI Re-render Detection Engine

**Phase**: 1 — Design & Contracts  
**Date**: 2026-04-02  
**API reference**: [contracts/public-api.md](contracts/public-api.md)

---

## Prerequisites

Install the required dev dependencies (not yet in the project):

```bash
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom jsdom
```

Update `package.json` scripts:

```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage"
}
```

Create or update `vitest.config.ts` at the project root:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    environmentMatchGlobs: [
      // Pure utility tests — no DOM needed
      ['src/render-tracker/__tests__/shallowDiff.test.ts', 'node'],
      ['src/render-tracker/__tests__/store.test.ts', 'node'],
    ],
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/render-tracker/**'],
      thresholds: { lines: 80 },
    },
  },
});
```

Create `vitest.setup.ts`:

```ts
import '@testing-library/jest-dom';
```

---

## Step 1 — Write tests first (TDD — NON-NEGOTIABLE)

Before writing any implementation code, write failing tests for all three modules.
Do NOT proceed to Step 2 until all three test files exist and fail with
"module not found" or equivalent errors.

### `src/render-tracker/__tests__/shallowDiff.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { shallowDiff } from '../shallowDiff';

describe('shallowDiff', () => {
  it('returns parent-render on first render (null prev)', () => {
    const result = shallowDiff(null, { value: 1 });
    expect(result.reason).toBe('parent-render');
    expect(result.changedKeys).toEqual([]);
  });

  it('detects a primitive value change', () => {
    const result = shallowDiff({ value: 1 }, { value: 2 });
    expect(result.reason).toBe('props-change');
    expect(result.changedKeys).toContain('value');
  });

  it('detects a reference-only change (same shallow contents)', () => {
    const prev = { items: [1, 2] };
    const next = { items: [1, 2] }; // new array, same contents
    const result = shallowDiff(prev, next);
    expect(result.reason).toBe('reference-change');
    expect(result.changedKeys).toContain('items');
  });

  it('returns parent-render when props are identical', () => {
    const shared = { items: [1, 2] };
    const result = shallowDiff({ shared }, { shared }); // same reference
    expect(result.reason).toBe('parent-render');
    expect(result.changedKeys).toEqual([]);
  });

  it('treats a missing key as a value change', () => {
    const result = shallowDiff({ a: 1, b: 2 }, { a: 1 });
    expect(result.reason).toBe('props-change');
    expect(result.changedKeys).toContain('b');
  });

  it('prioritises props-change over reference-change', () => {
    const result = shallowDiff(
      { a: 1, b: { x: 1 } },
      { a: 2, b: { x: 1 } }, // a changed value; b changed reference only
    );
    expect(result.reason).toBe('props-change');
    expect(result.changedKeys).toContain('a');
    expect(result.referenceChangedKeys).toContain('b');
  });
});
```

### `src/render-tracker/__tests__/store.test.ts`

```ts
import { describe, it, expect, afterEach } from 'vitest';
import { renderStore } from '../store';
import type { RenderEvent } from '../types';

const makeEvent = (overrides: Partial<RenderEvent> = {}): RenderEvent => ({
  componentName: 'TestComp',
  renderCount: 1,
  timestamp: new Date().toISOString(),
  reason: 'parent-render',
  changedKeys: [],
  prevProps: null,
  currentProps: {},
  ...overrides,
});

afterEach(() => renderStore.clear());

describe('renderStore', () => {
  it('returns empty array for unknown component', () => {
    expect(renderStore.getLog('Unknown')).toEqual([]);
  });

  it('appends events in order', () => {
    const e1 = makeEvent({ renderCount: 1 });
    const e2 = makeEvent({ renderCount: 2, reason: 'props-change' });
    renderStore.append('TestComp', e1);
    renderStore.append('TestComp', e2);
    const log = renderStore.getLog('TestComp');
    expect(log).toHaveLength(2);
    expect(log[0].renderCount).toBe(1);
    expect(log[1].reason).toBe('props-change');
  });

  it('isolates logs per component name', () => {
    renderStore.append('A', makeEvent({ componentName: 'A' }));
    renderStore.append('B', makeEvent({ componentName: 'B', renderCount: 1 }));
    expect(renderStore.getLog('A')).toHaveLength(1);
    expect(renderStore.getLog('B')).toHaveLength(1);
  });

  it('notifies subscribers on append', () => {
    const listener = vi.fn();
    const unsub = renderStore.subscribe(listener);
    renderStore.append('TestComp', makeEvent());
    expect(listener).toHaveBeenCalledTimes(1);
    unsub();
    renderStore.append('TestComp', makeEvent());
    expect(listener).toHaveBeenCalledTimes(1); // no longer called after unsub
  });

  it('getSnapshot identity changes after append', () => {
    const snap1 = renderStore.getSnapshot();
    renderStore.append('TestComp', makeEvent());
    const snap2 = renderStore.getSnapshot();
    expect(snap1).not.toBe(snap2);
  });
});
```

### `src/render-tracker/__tests__/useRenderTracker.test.ts`

```ts
import { describe, it, expect, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRenderTracker } from '../useRenderTracker';
import { renderStore } from '../store';

afterEach(() => renderStore.clear());

describe('useRenderTracker', () => {
  it('returns renderCount 1 and parent-render on first render', () => {
    const { result } = renderHook(() =>
      useRenderTracker('MyComp', { value: 1 }),
    );
    expect(result.current.renderCount).toBe(1);
    expect(result.current.reason).toBe('parent-render');
    expect(result.current.changedKeys).toEqual([]);
  });

  it('detects props-change on re-render with new value', () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: number }) =>
        useRenderTracker('MyComp', { value }),
      { initialProps: { value: 1 } },
    );
    rerender({ value: 2 });
    expect(result.current.renderCount).toBe(2);
    expect(result.current.reason).toBe('props-change');
    expect(result.current.changedKeys).toContain('value');
  });

  it('detects reference-change for same-value new array', () => {
    let items = [1, 2];
    const { result, rerender } = renderHook(() =>
      useRenderTracker('MyComp', { items }),
    );
    items = [1, 2]; // new array, same contents
    rerender();
    expect(result.current.reason).toBe('reference-change');
  });

  it('appends event to the global store', () => {
    renderHook(() => useRenderTracker('StoredComp', { x: 1 }));
    const log = renderStore.getLog('StoredComp');
    expect(log.length).toBeGreaterThanOrEqual(1);
    expect(log[0].componentName).toBe('StoredComp');
  });
});
```

---

## Step 2 — Implement the modules (in this order)

### A. `src/render-tracker/types.ts`

Define all exported types: `RenderReason`, `DiffResult`, `RenderEvent`,
`RenderTrackResult`. No logic — types only.

### B. `src/render-tracker/shallowDiff.ts`

Implement `shallowDiff` and the unexported `isShallowEqual` helper.
Run `vitest run shallowDiff` and ensure all its tests pass before moving on.

### C. `src/render-tracker/store.ts`

Implement the `RenderStore` class and export the `renderStore` singleton.
Run `vitest run store` and ensure all its tests pass before moving on.

### D. `src/render-tracker/useRenderTracker.ts`

Implement the hook using `useRef` + `useLayoutEffect`.
Run `vitest run useRenderTracker` and ensure all its tests pass.

### E. `src/render-tracker/index.ts`

Create the barrel re-export.

---

## Step 3 — Add tracking to a component

```tsx
// src/components/MyComponent.tsx
import { useRenderTracker } from '../render-tracker';

type Props = { title: string; count: number };

function MyComponent(props: Props): JSX.Element {
  // Track in development only — tree-shaken in production builds
  if (import.meta.env.DEV) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useRenderTracker('MyComponent', props as Record<string, unknown>);
  }

  return <div>{props.title}: {props.count}</div>;
}
```

> **Preferred pattern** (no lint suppression required): extract a `useDevRenderTracker`
> wrapper that is a no-op in production:
>
> ```ts
> // src/render-tracker/useDevRenderTracker.ts
> import { useRenderTracker } from './useRenderTracker';
> import type { RenderTrackResult } from './types';
>
> const noop: RenderTrackResult = {
>   componentName: '',
>   renderCount: 0,
>   reason: 'parent-render',
>   changedKeys: [],
> };
>
> export function useDevRenderTracker(
>   componentName: string,
>   props: Record<string, unknown>,
> ): RenderTrackResult {
>   if (!import.meta.env.DEV) return noop;
>   // eslint-disable-next-line react-hooks/rules-of-hooks
>   return useRenderTracker(componentName, props);
> }
> ```

---

## Step 4 — Query render history programmatically

```ts
import { renderStore } from '../render-tracker';

// Get all events for one component
const log = renderStore.getLog('MyComponent');
console.table(log.map(e => ({
  render: e.renderCount,
  reason: e.reason,
  keys: e.changedKeys.join(', ') || '—',
  time: e.timestamp,
})));
```

---

## Step 5 — Build a reactive display consumer (optional)

```tsx
import { useSyncExternalStore } from 'react';
import { renderStore } from '../render-tracker';

function RenderHistoryPanel(): JSX.Element {
  const logs = useSyncExternalStore(
    renderStore.subscribe,
    renderStore.getSnapshot,
  );

  return (
    <section aria-label="Render history">
      {Array.from(logs.entries()).map(([name, events]) => (
        <details key={name}>
          <summary>{name} — {events.length} renders</summary>
          <ul>
            {events.map(e => (
              <li key={`${e.componentName}-${e.renderCount}`}>
                #{e.renderCount} · {e.reason}
                {e.changedKeys.length > 0 && ` · [${e.changedKeys.join(', ')}]`}
              </li>
            ))}
          </ul>
        </details>
      ))}
    </section>
  );
}
```

---

## CI Verification Checklist

Before opening a PR, confirm:

- [ ] `npm run test:coverage` passes with ≥80% line coverage on `src/render-tracker/**`
- [ ] `tsc --noEmit` reports zero errors
- [ ] `npm run lint` reports zero errors
- [ ] `shallowDiff.test.ts` and `store.test.ts` run in the `node` environment
      (no DOM globals)
- [ ] All acceptance scenarios from `spec.md` have a corresponding passing test
