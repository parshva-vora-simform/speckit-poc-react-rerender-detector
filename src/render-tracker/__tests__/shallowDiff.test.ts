import { describe, it, expect } from 'vitest';
import { shallowDiff } from '../shallowDiff';

// ─── US1 + US3: shallowDiff classification ───────────────────────────────────

describe('shallowDiff — first render (null prev)', () => {
  it('returns parent-render when prev is null', () => {
    const result = shallowDiff(null, { value: 1 });
    expect(result.reason).toBe('parent-render');
    expect(result.changedKeys).toEqual([]);
    expect(result.valueChangedKeys).toEqual([]);
    expect(result.referenceChangedKeys).toEqual([]);
  });
});

describe('shallowDiff — primitive value change', () => {
  it('returns props-change when a primitive value differs', () => {
    const result = shallowDiff({ value: 1 }, { value: 2 });
    expect(result.reason).toBe('props-change');
    expect(result.changedKeys).toContain('value');
    expect(result.valueChangedKeys).toContain('value');
    expect(result.referenceChangedKeys).toEqual([]);
  });

  it('returns props-change for string value change', () => {
    const result = shallowDiff({ label: 'a' }, { label: 'b' });
    expect(result.reason).toBe('props-change');
    expect(result.changedKeys).toContain('label');
  });

  it('returns props-change when a key transitions to undefined', () => {
    const result = shallowDiff(
      { title: 'hello' },
      { title: undefined as unknown as string },
    );
    expect(result.reason).toBe('props-change');
    expect(result.changedKeys).toContain('title');
  });
});

describe('shallowDiff — reference-only change', () => {
  it('returns reference-change for a new array with same contents', () => {
    const prev = { items: [1, 2] };
    const next = { items: [1, 2] }; // new array, same contents
    const result = shallowDiff(prev, next);
    expect(result.reason).toBe('reference-change');
    expect(result.changedKeys).toContain('items');
    expect(result.referenceChangedKeys).toContain('items');
    expect(result.valueChangedKeys).toEqual([]);
  });

  it('returns reference-change for a new plain object with same primitive keys', () => {
    const result = shallowDiff({ cfg: { x: 1 } }, { cfg: { x: 1 } });
    expect(result.reason).toBe('reference-change');
    expect(result.changedKeys).toContain('cfg');
  });

  it('returns reference-change for a replaced inline function (zero own-keys)', () => {
    const result = shallowDiff(
      { onClick: (): void => undefined },
      { onClick: (): void => undefined },
    );
    expect(result.reason).toBe('reference-change');
    expect(result.changedKeys).toContain('onClick');
  });
});

describe('shallowDiff — no change (parent-render)', () => {
  it('returns parent-render when all props are identical references', () => {
    const items = [1, 2];
    const result = shallowDiff({ items }, { items }); // same reference
    expect(result.reason).toBe('parent-render');
    expect(result.changedKeys).toEqual([]);
  });

  it('returns parent-render for identical primitive props', () => {
    const result = shallowDiff({ count: 5, label: 'hi' }, { count: 5, label: 'hi' });
    expect(result.reason).toBe('parent-render');
    expect(result.changedKeys).toEqual([]);
  });
});

describe('shallowDiff — key addition / removal', () => {
  it('returns props-change when a key is absent in next', () => {
    const result = shallowDiff({ a: 1, b: 2 }, { a: 1 });
    expect(result.reason).toBe('props-change');
    expect(result.changedKeys).toContain('b');
  });

  it('returns props-change when a new key appears in next', () => {
    const result = shallowDiff({ a: 1 }, { a: 1, b: 2 });
    expect(result.reason).toBe('props-change');
    expect(result.changedKeys).toContain('b');
  });
});

describe('shallowDiff — priority: props-change wins over reference-change', () => {
  it('reports props-change when both value-changed and reference-changed keys exist', () => {
    const result = shallowDiff(
      { a: 1, b: { x: 1 } },
      { a: 2, b: { x: 1 } }, // a: value changed; b: reference changed only
    );
    expect(result.reason).toBe('props-change');
    expect(result.changedKeys).toContain('a');
    // b should still appear in referenceChangedKeys even though overall reason is props-change
    expect(result.referenceChangedKeys).toContain('b');
    expect(result.valueChangedKeys).toContain('a');
  });
});
