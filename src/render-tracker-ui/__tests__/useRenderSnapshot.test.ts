import { describe, it, expect, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { renderStore } from '../../render-tracker';
import type { RenderEvent } from '../../render-tracker';
import { useRenderSnapshot } from '../useRenderSnapshot';

function makeEvent(componentName: string, overrides: Partial<RenderEvent> = {}): RenderEvent {
  return {
    componentName,
    renderCount: 1,
    timestamp: new Date().toISOString(),
    reason: 'parent-render',
    changedKeys: [],
    prevProps: null,
    currentProps: {},
    ...overrides,
  };
}

afterEach(() => {
  renderStore.clear();
});

describe('useRenderSnapshot', () => {
  it('returns empty summaries when the store is empty', () => {
    const { result } = renderHook(() => useRenderSnapshot());
    expect(result.current.summaries).toEqual([]);
  });

  it('returns a summary reflecting an existing store entry', () => {
    renderStore.append('Alpha', makeEvent('Alpha', { renderCount: 1 }));
    const { result } = renderHook(() => useRenderSnapshot());
    expect(result.current.summaries).toHaveLength(1);
    expect(result.current.summaries[0]!.componentName).toBe('Alpha');
    expect(result.current.summaries[0]!.totalRenderCount).toBe(1);
  });

  it('updates summaries reactively when store changes', () => {
    const { result } = renderHook(() => useRenderSnapshot());
    expect(result.current.summaries).toHaveLength(0);

    act(() => {
      renderStore.append('Beta', makeEvent('Beta', { renderCount: 1 }));
    });

    expect(result.current.summaries).toHaveLength(1);
    expect(result.current.summaries[0]!.componentName).toBe('Beta');
  });

  it('increments the count when a second event is appended for the same component', () => {
    renderStore.append('Gamma', makeEvent('Gamma', { renderCount: 1 }));
    const { result } = renderHook(() => useRenderSnapshot());
    expect(result.current.summaries[0]!.totalRenderCount).toBe(1);

    act(() => {
      renderStore.append('Gamma', makeEvent('Gamma', { renderCount: 2 }));
    });

    expect(result.current.summaries[0]!.totalRenderCount).toBe(2);
  });
});
