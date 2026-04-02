/* eslint-disable react-hooks/refs */
/*
 * ARCHITECTURAL VARIANCE — react-hooks/refs disabled for this file.
 * Documented in: specs/001-render-tracker-engine/plan.md (Complexity Tracking).
 *
 * The `react-hooks/refs` rule (react-hooks@7) disallows reading or writing
 * ref.current during the render body to protect concurrent-mode correctness in
 * production components. This hook is a development-only debugging instrument
 * whose ENTIRE PURPOSE is to observe every render invocation, including
 * concurrent-mode extra invocations. Accessing refs during render here is
 * therefore intentional and semantically correct:
 *
 *   - renderCountRef.current += 1  — counts every invocation, including
 *     Strict Mode doubles and concurrent re-tries.
 *   - prevPropsRef.current (read)  — retrieves the previous render's snapshot
 *     for diff computation, which must happen synchronously during this render
 *     so the result is available to the caller immediately.
 *   - prevPropsRef.current (write) — stores current props for the next render's
 *     diff, must happen after the diff to avoid comparing a snapshot against
 *     itself.
 *
 * Moving all of the above to useLayoutEffect would delay the result by one
 * render, making the hook return stale data on every render — which defeats its
 * purpose. This is an accepted pattern for React-internal debugging tooling
 * (e.g., why-did-you-render, React DevTools).
 */
import { useLayoutEffect, useRef } from 'react';
import { shallowDiff } from './shallowDiff';
import { renderStore } from './store';
import type { RenderEvent, RenderTrackResult } from './types';

/**
 * Custom React hook that tracks re-renders for the calling component.
 *
 * Call this hook at the top level of a function component, passing the
 * component's name and its current props. Returns a RenderTrackResult
 * synchronously from the render body and appends a RenderEvent to the global
 * store inside useLayoutEffect after each committed render.
 *
 * @param componentName - Stable identifier for this component instance.
 * @param props - The component's current props as a plain object.
 * @returns RenderTrackResult for the current render.
 *
 * @remarks
 * - useRef is used for prev-props snapshot and render count so that mutations
 *   do not trigger additional re-renders.
 * - The store append is deferred to useLayoutEffect (runs synchronously after
 *   DOM mutations, before paint) to keep the render body side-effect-free with
 *   respect to external state.
 * - In React Strict Mode, the render body executes twice per committed render.
 *   The render count reflects all invocations transparently.
 */
export function useRenderTracker(
  componentName: string,
  props: Record<string, unknown>,
): RenderTrackResult {
  // Refs — mutations here do not trigger re-renders
  const prevPropsRef = useRef<Readonly<Record<string, unknown>> | null>(null);
  const renderCountRef = useRef(0);

  // Increment and snapshot the render count for this invocation
  renderCountRef.current += 1;
  const currentCount = renderCountRef.current;

  // Snapshot props immediately (shallow copy to prevent aliasing)
  const currentProps: Readonly<Record<string, unknown>> = { ...props };

  // Compute the diff synchronously in the render body (pure, no side effects)
  const diff = shallowDiff(prevPropsRef.current, currentProps);

  // Build result synchronously so callers receive it this render
  const result: RenderTrackResult = {
    componentName,
    renderCount: currentCount,
    reason: diff.reason,
    changedKeys: diff.changedKeys as string[],
  };

  // Capture values for the effect closure before updating the ref
  const prevPropsSnapshot = prevPropsRef.current;

  // Update prev-props ref AFTER the diff — next render will diff against this
  prevPropsRef.current = currentProps;

  // Append to the global store after the DOM is updated (side-effect safe)
  useLayoutEffect((): void => {
    const event: RenderEvent = {
      componentName,
      renderCount: currentCount,
      timestamp: new Date().toISOString(),
      reason: diff.reason,
      changedKeys: diff.changedKeys as string[],
      prevProps: prevPropsSnapshot,
      currentProps,
    };
    renderStore.append(componentName, event);
  });

  return result;
}
/* eslint-enable react-hooks/refs */
