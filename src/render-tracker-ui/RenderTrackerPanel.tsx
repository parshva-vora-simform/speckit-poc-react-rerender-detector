import type { ReactElement } from 'react';
import { useState, useRef } from 'react';
import { useRenderSnapshot } from './useRenderSnapshot';
import { ComponentListView } from './ComponentListView';
import { ComponentDetailView } from './ComponentDetailView';
import { computeEventRows } from './computeEventRows';
import type { RenderTrackerPanelProps } from './types';

/**
 * Root devtool panel component.
 *
 * Subscribes to the global renderStore via useRenderSnapshot and renders:
 * - Overview mode: ComponentListView with live severity badges + insights
 * - Detail mode: ComponentDetailView for the selected component
 *
 * IMPORTANT: Only render this component when import.meta.env.DEV === true.
 * Example: {import.meta.env.DEV && <RenderTrackerPanel />}
 *
 * Constitution Principle I: state lives here, children are pure renderers.
 */
export function RenderTrackerPanel({
  className,
}: RenderTrackerPanelProps): ReactElement {
  const { summaries, eventsByComponent } = useRenderSnapshot();
  const [selectedComponentName, setSelectedComponentName] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // If the selected component disappears from the snapshot, fall back to overview.
  const resolvedName =
    selectedComponentName !== null &&
    summaries.some((s) => s.componentName === selectedComponentName)
      ? selectedComponentName
      : null;

  function handleSelect(componentName: string): void {
    setSelectedComponentName(componentName);
  }

  function handleClose(): void {
    setSelectedComponentName(null);
    // Return focus to the list wrapper on close (FR-012)
    listRef.current?.focus();
  }

  const eventRows =
    resolvedName !== null
      ? computeEventRows(eventsByComponent[resolvedName] ?? [])
      : [];

  return (
    <div
      className={`rtu-panel${className != null ? ` ${className}` : ''}`}
      ref={listRef}
    >
      <h2 className="rtu-panel__title">Render Tracker</h2>
      {resolvedName !== null ? (
        <ComponentDetailView
          componentName={resolvedName}
          eventRows={eventRows}
          onClose={handleClose}
        />
      ) : (
        <ComponentListView summaries={summaries} onSelect={handleSelect} />
      )}
    </div>
  );
}
