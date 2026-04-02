/**
 * Public API for the render-tracker engine.
 *
 * @example
 * ```ts
 * import { useRenderTracker, renderStore } from '../render-tracker';
 * ```
 */
export type { RenderReason, DiffResult, RenderEvent, RenderTrackResult } from './types';
export { shallowDiff } from './shallowDiff';
export { renderStore } from './store';
export { useRenderTracker } from './useRenderTracker';
