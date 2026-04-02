import { describe, it, expect, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRenderTracker } from '../useRenderTracker';
import { renderStore } from '../store';

afterEach(() => {
  renderStore.clear();
});

// ─── US1: hook contract ───────────────────────────────────────────────────────

describe('useRenderTracker — first render', () => {
  it('returns renderCount 1 and reason parent-render on first render', () => {
    const { result } = renderHook(() =>
      useRenderTracker('MyComp', { value: 1 }),
    );
    expect(result.current.renderCount).toBe(1);
    expect(result.current.reason).toBe('parent-render');
    expect(result.current.changedKeys).toEqual([]);
    expect(result.current.componentName).toBe('MyComp');
  });
});

describe('useRenderTracker — props-change', () => {
  it('reports props-change and incremented count when a value changes', () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: number }) =>
        useRenderTracker('MyComp', { value }),
      { initialProps: { value: 1 } },
    );
    act(() => { rerender({ value: 2 }); });
    expect(result.current.renderCount).toBeGreaterThanOrEqual(2);
    expect(result.current.reason).toBe('props-change');
    expect(result.current.changedKeys).toContain('value');
  });
});

describe('useRenderTracker — reference-change', () => {
  it('reports reference-change for a new array with same contents', () => {
    let items = [1, 2];
    const { result, rerender } = renderHook(
      () => useRenderTracker('MyComp', { items }),
    );
    act(() => {
      items = [1, 2]; // new array, same values
      rerender();
    });
    expect(result.current.reason).toBe('reference-change');
    expect(result.current.changedKeys).toContain('items');
  });
});

describe('useRenderTracker — parent-render', () => {
  it('reports parent-render when props refs are unchanged', () => {
    const props = { x: 1 };
    const { result, rerender } = renderHook(
      () => useRenderTracker('MyComp', props),
    );
    act(() => { rerender(); });
    expect(result.current.reason).toBe('parent-render');
    expect(result.current.changedKeys).toEqual([]);
  });
});

describe('useRenderTracker — global store', () => {
  it('appends a RenderEvent to renderStore via useLayoutEffect', () => {
    renderHook(() => useRenderTracker('StoredComp', { x: 1 }));
    const log = renderStore.getLog('StoredComp');
    expect(log.length).toBeGreaterThanOrEqual(1);
    expect(log[0]!.componentName).toBe('StoredComp');
    expect(log[0]!.timestamp).toBeTruthy();
    expect(typeof log[0]!.renderCount).toBe('number');
  });
});

// ─── US2: multi-component store integration ───────────────────────────────────

describe('useRenderTracker — multi-component isolation in store', () => {
  it('tracks two components at the same time without cross-contamination', () => {
    const { rerender: rerenderA } = renderHook(
      ({ v }: { v: number }) => useRenderTracker('CompA', { v }),
      { initialProps: { v: 1 } },
    );
    const { rerender: rerenderB } = renderHook(
      ({ v }: { v: number }) => useRenderTracker('CompB', { v }),
      { initialProps: { v: 10 } },
    );

    act(() => {
      rerenderA({ v: 2 });
      rerenderB({ v: 20 });
    });

    const all = renderStore.getAllLogs();
    expect(all.has('CompA')).toBe(true);
    expect(all.has('CompB')).toBe(true);
    // Each component should have its own events
    const logA = renderStore.getLog('CompA');
    const logB = renderStore.getLog('CompB');
    expect(logA.every(e => e.componentName === 'CompA')).toBe(true);
    expect(logB.every(e => e.componentName === 'CompB')).toBe(true);
  });
});
