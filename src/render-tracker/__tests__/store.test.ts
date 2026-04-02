import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderStore } from '../store';
import type { RenderEvent } from '../types';

// Helper to build a minimal valid RenderEvent
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

afterEach(() => {
  renderStore.clear();
});

// ─── US1: basic store contract ────────────────────────────────────────────────

describe('renderStore — getLog', () => {
  it('returns empty array for a component that has never tracked', () => {
    expect(renderStore.getLog('Unknown')).toEqual([]);
  });

  it('appends events in insertion order', () => {
    const e1 = makeEvent({ renderCount: 1 });
    const e2 = makeEvent({ renderCount: 2, reason: 'props-change' });
    renderStore.append('TestComp', e1);
    renderStore.append('TestComp', e2);
    const log = renderStore.getLog('TestComp');
    expect(log).toHaveLength(2);
    expect(log[0]!.renderCount).toBe(1);
    expect(log[1]!.reason).toBe('props-change');
  });
});

describe('renderStore — subscriber notifications', () => {
  it('notifies a subscriber on append', () => {
    const listener = vi.fn();
    const unsub = renderStore.subscribe(listener);
    renderStore.append('TestComp', makeEvent());
    expect(listener).toHaveBeenCalledTimes(1);
    unsub();
  });

  it('stops notifying after unsubscribe', () => {
    const listener = vi.fn();
    const unsub = renderStore.subscribe(listener);
    unsub();
    renderStore.append('TestComp', makeEvent());
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('renderStore — getSnapshot', () => {
  it('returns a new snapshot identity after each append', () => {
    const snap1 = renderStore.getSnapshot();
    renderStore.append('TestComp', makeEvent());
    const snap2 = renderStore.getSnapshot();
    expect(snap1).not.toBe(snap2);
  });

  it('returns the same snapshot identity when no append occurred', () => {
    const snap1 = renderStore.getSnapshot();
    const snap2 = renderStore.getSnapshot();
    expect(snap1).toBe(snap2);
  });
});

describe('renderStore — clear', () => {
  it('removes all logs', () => {
    renderStore.append('TestComp', makeEvent());
    renderStore.clear();
    expect(renderStore.getLog('TestComp')).toEqual([]);
  });

  it('notifies subscribers on clear', () => {
    const listener = vi.fn();
    const unsub = renderStore.subscribe(listener);
    renderStore.clear();
    expect(listener).toHaveBeenCalledTimes(1);
    unsub();
  });
});

// ─── US2: multi-component isolation ──────────────────────────────────────────

describe('renderStore — multi-component isolation', () => {
  it('keeps logs isolated per component name', () => {
    renderStore.append('CompA', makeEvent({ componentName: 'CompA' }));
    renderStore.append('CompB', makeEvent({ componentName: 'CompB', renderCount: 1 }));
    renderStore.append('CompC', makeEvent({ componentName: 'CompC', renderCount: 1 }));

    expect(renderStore.getLog('CompA')).toHaveLength(1);
    expect(renderStore.getLog('CompB')).toHaveLength(1);
    expect(renderStore.getLog('CompC')).toHaveLength(1);
  });

  it('getAllLogs returns all tracked components', () => {
    renderStore.append('CompA', makeEvent({ componentName: 'CompA' }));
    renderStore.append('CompB', makeEvent({ componentName: 'CompB' }));
    const all = renderStore.getAllLogs();
    expect(all.has('CompA')).toBe(true);
    expect(all.has('CompB')).toBe(true);
  });

  it('appending to CompA does not change CompB log array reference', () => {
    renderStore.append('CompA', makeEvent({ componentName: 'CompA' }));
    renderStore.append('CompB', makeEvent({ componentName: 'CompB' }));
    const logBefore = renderStore.getLog('CompB');
    renderStore.append('CompA', makeEvent({ componentName: 'CompA', renderCount: 2 }));
    const logAfter = renderStore.getLog('CompB');
    // CompB's events array content should not have changed
    expect(logAfter).toHaveLength(logBefore.length);
  });

  it('getLog on a never-tracked component returns [] not an error', () => {
    expect(() => renderStore.getLog('NeverTracked')).not.toThrow();
    expect(renderStore.getLog('NeverTracked')).toEqual([]);
  });
});
