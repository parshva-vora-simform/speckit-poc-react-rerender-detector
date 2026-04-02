// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { computeEventRows } from '../computeEventRows';
import type { RenderEvent } from '../../render-tracker';

function makeEvent(overrides: Partial<RenderEvent> = {}): RenderEvent {
  return {
    componentName: 'TestComp',
    renderCount: 1,
    timestamp: new Date().toISOString(),
    reason: 'parent-render',
    changedKeys: [],
    prevProps: null,
    currentProps: {},
    ...overrides,
  };
}

describe('computeEventRows', () => {
  it('returns empty array for empty event list', () => {
    expect(computeEventRows([])).toEqual([]);
  });

  it('assigns 1-based render numbers in order', () => {
    const events = [
      makeEvent({ renderCount: 1 }),
      makeEvent({ renderCount: 2 }),
      makeEvent({ renderCount: 3 }),
    ];
    const rows = computeEventRows(events);
    expect(rows[0]!.renderNumber).toBe(1);
    expect(rows[1]!.renderNumber).toBe(2);
    expect(rows[2]!.renderNumber).toBe(3);
  });

  it('sets propDiffRows to empty for parent-render events', () => {
    const rows = computeEventRows([makeEvent({ reason: 'parent-render' })]);
    expect(rows[0]!.propDiffRows).toEqual([]);
  });

  it('populates propDiffRows for props-change events', () => {
    const events = [
      makeEvent({
        reason: 'props-change',
        changedKeys: ['count'],
        prevProps: { count: 0, label: 'a' },
        currentProps: { count: 1, label: 'a' },
      }),
    ];
    const rows = computeEventRows(events);
    expect(rows[0]!.propDiffRows).toHaveLength(1);
    const row = rows[0]!.propDiffRows[0]!;
    expect(row.key).toBe('count');
    expect(row.prevDisplay).toBe('0');
    expect(row.nextDisplay).toBe('1');
    expect(row.changeType).toBe('value-change');
  });

  it('populates propDiffRows for reference-change events with reference-change type', () => {
    const events = [
      makeEvent({
        reason: 'reference-change',
        changedKeys: ['items'],
        prevProps: { items: [1, 2] },
        currentProps: { items: [1, 2] },
      }),
    ];
    const rows = computeEventRows(events);
    const row = rows[0]!.propDiffRows[0]!;
    expect(row.key).toBe('items');
    expect(row.changeType).toBe('reference-change');
    expect(row.prevDisplay).toBe('[array]');
    expect(row.nextDisplay).toBe('[array]');
  });

  it('uses "—" as prevDisplay when prevProps is null', () => {
    const events = [
      makeEvent({
        reason: 'props-change',
        changedKeys: ['x'],
        prevProps: null,
        currentProps: { x: 42 },
      }),
    ];
    const rows = computeEventRows(events);
    expect(rows[0]!.propDiffRows[0]!.prevDisplay).toBe('—');
  });

  it('uses "—" as prevDisplay when key is absent from prevProps', () => {
    const events = [
      makeEvent({
        reason: 'props-change',
        changedKeys: ['newKey'],
        prevProps: { otherKey: 'a' },
        currentProps: { newKey: 'b' },
      }),
    ];
    const rows = computeEventRows(events);
    expect(rows[0]!.propDiffRows[0]!.prevDisplay).toBe('—');
  });

  it('preserves event reason in the row', () => {
    const rows = computeEventRows([makeEvent({ reason: 'reference-change', changedKeys: ['fn'] })]);
    expect(rows[0]!.reason).toBe('reference-change');
  });
});
