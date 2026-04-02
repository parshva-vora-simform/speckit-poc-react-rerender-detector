import type { RenderEvent } from './types';

/**
 * Module-level singleton render event store.
 *
 * Design rationale: a Context-based store would cause every tracked component
 * to re-render whenever any other tracked component fires — a feedback loop.
 * A module singleton avoids this entirely and works without a Provider in the
 * React tree, allowing headless Node.js testing.
 *
 * The subscribe/getSnapshot pair is intentionally compatible with React's
 * useSyncExternalStore for optional reactive consumer components.
 */
class RenderStore {
  private readonly _logs: Map<string, RenderEvent[]> = new Map();
  private readonly _listeners: Set<() => void> = new Set();
  private _snapshot: ReadonlyMap<string, RenderEvent[]>;

  constructor() {
    this._snapshot = new Map(this._logs);
  }

  /**
   * Appends a render event to the named component's log and notifies all
   * subscribers. Creates the log array on first append for this component name.
   */
  append(componentName: string, event: RenderEvent): void {
    const existing = this._logs.get(componentName) ?? [];
    this._logs.set(componentName, [...existing, event]);
    // Invalidate snapshot — identity must change on every mutation
    this._snapshot = new Map(this._logs);
    this._notify();
  }

  /**
   * Returns all recorded render events for the given component.
   * Returns an empty array (not an error) if the component has never tracked.
   */
  getLog(componentName: string): RenderEvent[] {
    return this._logs.get(componentName) ?? [];
  }

  /**
   * Returns a read-only view of all logs keyed by component name.
   * Suitable for display panels and debugging.
   */
  getAllLogs(): ReadonlyMap<string, RenderEvent[]> {
    return this._snapshot;
  }

  /**
   * Registers a change listener. Returns an unsubscribe function.
   * Compatible with the first argument of useSyncExternalStore.
   */
  subscribe(listener: () => void): () => void {
    this._listeners.add(listener);
    return (): void => {
      this._listeners.delete(listener);
    };
  }

  /**
   * Returns the current immutable snapshot. Object identity changes only when
   * append() or clear() is called.
   * Compatible with the second argument of useSyncExternalStore.
   */
  getSnapshot(): ReadonlyMap<string, RenderEvent[]> {
    return this._snapshot;
  }

  /**
   * Removes all logs and notifies subscribers.
   * Intended for test teardown: afterEach(() => renderStore.clear()).
   */
  clear(): void {
    this._logs.clear();
    this._snapshot = new Map(this._logs);
    this._notify();
  }

  private _notify(): void {
    for (const listener of this._listeners) {
      listener();
    }
  }
}

/** The global render event store. Module-level singleton. */
export const renderStore = new RenderStore();
