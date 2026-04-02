import { useRenderTracker } from './useRenderTracker';
import type { RenderTrackResult } from './types';

/** No-op result returned in production builds — zero overhead. */
const NOOP_RESULT: RenderTrackResult = {
  componentName: '',
  renderCount: 0,
  reason: 'parent-render',
  changedKeys: [],
};

/**
 * Production-safe wrapper around useRenderTracker.
 *
 * Returns a no-op RenderTrackResult when import.meta.env.DEV is falsy so that
 * the real hook (and its store writes) are tree-shaken in production builds.
 * Use this instead of useRenderTracker directly to avoid per-call lint
 * suppressions for conditional hook usage.
 *
 * @example
 * ```tsx
 * function MyComponent(props: MyProps) {
 *   useDevRenderTracker('MyComponent', props as Record<string, unknown>);
 *   return <div>{props.title}</div>;
 * }
 * ```
 */
export function useDevRenderTracker(
  componentName: string,
  props: Record<string, unknown>,
): RenderTrackResult {
  if (!import.meta.env.DEV) {
    return NOOP_RESULT;
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useRenderTracker(componentName, props);
}
