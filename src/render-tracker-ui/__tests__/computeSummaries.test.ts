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
    timestamp: new Date().toISOString(),
    reason: 'parent-render',
    changedKeys: [],
    prevProps: null,
    currentProps: {},
    ...overrides,
  };
}

describe('computeSummaries — overview fields', () => {
  it('returns empty array for an empty snapshot', () => {
    expect(computeSummaries({})).toEqual([]);
  });

  it('sets totalRenderCount from event array length', () => {
    const events = [makeEvent('A'), makeEvent('A', { renderCount: 2 })];
    const [s] = computeSummaries({ A: events });
    expect(s!.totalRenderCount).toBe(2);
  });

  it('assigns low severity for 1–5 renders', () => {
    const events = Array.from({ length: 3 }, (_, i) =>
      makeEvent('A', { renderCount: i + 1 }),
    );
    const [s] = computeSummaries({ A: events });
    expect(s!.severityLevel).toBe('low');
  });

  it('assigns low severity for exactly 5 renders', () => {
    const events = Array.from({ length: 5 }, (_, i) =>
      makeEvent('A', { renderCount: i + 1 }),
    );
    const [s] = computeSummaries({ A: events });
    expect(s!.severityLevel).toBe('low');
  });

  it('assigns medium severity for 6 renders', () => {
    const events = Array.from({ length: 6 }, (_, i) =>
      makeEvent('B', { renderCount: i + 1 }),
    );
    const [s] = computeSummaries({ B: events });
    expect(s!.severityLevel).toBe('medium');
  });

  it('assigns medium severity for exactly 20 renders', () => {
    const events = Array.from({ length: 20 }, (_, i) =>
      makeEvent('B', { renderCount: i + 1 }),
    );
    const [s] = computeSummaries({ B: events });
    expect(s!.severityLevel).toBe('medium');
  });

  it('assigns high severity for 21 renders', () => {
    const events = Array.from({ length: 21 }, (_, i) =>
      makeEvent('C', { renderCount: i + 1 }),
    );
    const [s] = computeSummaries({ C: events });
    expect(s!.severityLevel).toBe('high');
  });

  it('sets latestReason from the last event', () => {
    const events = [
      makeEvent('D', { reason: 'parent-render' }),
      makeEvent('D', { reason: 'props-change' }),
    ];
    const [s] = computeSummaries({ D: events });
    expect(s!.latestReason).toBe('props-change');
  });

  it('handles multiple components in the snapshot', () => {
    const summaries = computeSummaries({
      Alpha: [makeEvent('Alpha')],
      Beta: [makeEvent('Beta'), makeEvent('Beta', { renderCount: 2 })],
    });
    expect(summaries).toHaveLength(2);
    const names = summaries.map((s) => s.componentName);
    expect(names).toContain('Alpha');
    expect(names).toContain('Beta');
  });
});

// T018 — insight field cases appended here in Phase 5
describe('computeSummaries — insight fields', () => {
  it('sets hasHighRenderWarning true when totalRenderCount > 20', () => {
    const events = Array.from({ length: 21 }, (_, i) =>
      makeEvent('E', { renderCount: i + 1 }),
    );
    const [s] = computeSummaries({ E: events });
    expect(s!.hasHighRenderWarning).toBe(true);
  });

  it('does NOT set hasHighRenderWarning at exactly 20 renders', () => {
    const events = Array.from({ length: 20 }, (_, i) =>
      makeEvent('F', { renderCount: i + 1 }),
    );
    const [s] = computeSummaries({ F: events });
    expect(s!.hasHighRenderWarning).toBe(false);
  });

  it('sets hasReferenceInstabilityHint when last 5 renders are all reference-change', () => {
    const events = Array.from({ length: 5 }, (_, i) =>
      makeEvent('G', { renderCount: i + 1, reason: 'reference-change' }),
    );
    const [s] = computeSummaries({ G: events });
    expect(s!.hasReferenceInstabilityHint).toBe(true);
  });

  it('does NOT set hint when fewer than 5 events exist', () => {
    const events = Array.from({ length: 4 }, (_, i) =>
      makeEvent('H', { renderCount: i + 1, reason: 'reference-change' }),
    );
    const [s] = computeSummaries({ H: events });
    expect(s!.hasReferenceInstabilityHint).toBe(false);
  });

  it('does NOT set hint when last 5 are not all reference-change', () => {
    const events = [
      makeEvent('I', { renderCount: 1, reason: 'reference-change' }),
      makeEvent('I', { renderCount: 2, reason: 'reference-change' }),
      makeEvent('I', { renderCount: 3, reason: 'reference-change' }),
      makeEvent('I', { renderCount: 4, reason: 'reference-change' }),
      makeEvent('I', { renderCount: 5, reason: 'props-change' }),
    ];
    const [s] = computeSummaries({ I: events });
    expect(s!.hasReferenceInstabilityHint).toBe(false);
  });
});
