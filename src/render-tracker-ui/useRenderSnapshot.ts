import { useSyncExternalStore } from 'react';
import type { RenderEvent } from '../render-tracker';
import { renderStore } from '../render-tracker';
import { computeSummaries } from './computeSummaries';
import type { ComponentSummary } from './types';

interface RenderSnapshot {
  readonly summaries: ComponentSummary[];
  readonly eventsByComponent: Readonly<Record<string, readonly RenderEvent[]>>;
}

/**
 * Custom hook that subscribes to the global renderStore and returns a derived
 * ComponentSummary[] for every tracked component.
 *
 * Uses useSyncExternalStore (React 19) to avoid tearing in concurrent mode.
 * The subscription is isolated here so no panel component accesses the store
 * directly — Constitution Principle I (side effects in custom hooks).
 */
export function useRenderSnapshot(): RenderSnapshot {
  const snapshotMap = useSyncExternalStore(
    renderStore.subscribe.bind(renderStore),
    renderStore.getSnapshot.bind(renderStore),
  );
  // Convert Map to plain Record so computeSummaries can use Object.entries()
  const snapshot = Object.fromEntries(snapshotMap);
  const summaries = computeSummaries(snapshot);
  return { summaries, eventsByComponent: snapshot };
}
